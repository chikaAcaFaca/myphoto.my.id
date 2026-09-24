import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { recalculateStorageLimit } from '@/lib/storage-limit';
import { verifyCreemSignature, getTierFromCreemProductId } from '@/lib/creem';

export const dynamic = 'force-dynamic';

/**
 * Creem webhook. Register https://myphotomy.space/api/webhooks/creem in
 * Dashboard → Developers → Webhooks and put its secret in CREEM_WEBHOOK_SECRET.
 *
 * Writes the same `subscriptions` doc shape as the Paddle/Freemius routes
 * (userId, tier, storageAmount, status, currentPeriodEnd) so
 * recalculateStorageLimit() needs no provider-specific logic.
 *
 * Access model:
 *   subscription.active / paid / trialing / update  → active
 *   subscription.scheduled_cancel / past_due        → still active (paid period
 *                                                      runs out / Creem retries)
 *   subscription.canceled / expired / paused        → inactive
 */

interface CreemSubscription {
  id: string;
  status?: string;
  product?: string | { id: string };
  customer?: string | { id: string; email?: string };
  current_period_end_date?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface CreemEvent {
  id: string;
  eventType: string;
  created_at: number;
  object: any;
}

const ref = (v: string | { id: string } | undefined) => (typeof v === 'string' ? v : v?.id);

async function resolveUserId(sub: CreemSubscription): Promise<string | null> {
  const fromMeta = sub.metadata?.userId;
  if (typeof fromMeta === 'string' && fromMeta) {
    const u = await db.collection('users').doc(fromMeta).get();
    if (u.exists) return fromMeta;
  }
  // Fallback for subscriptions created outside our checkout route (e.g. a
  // storefront link): match the buyer's email.
  const email = typeof sub.customer === 'object' ? sub.customer?.email : undefined;
  if (!email) return null;
  const snap = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

async function upsertSubscription(sub: CreemSubscription, status: 'active' | 'cancelled') {
  const docId = `cr_${sub.id}`;
  const docRef = db.collection('subscriptions').doc(docId);
  const existing = await docRef.get();

  const userId = existing.exists ? (existing.data()!.userId as string) : await resolveUserId(sub);
  if (!userId || userId === 'deleted') {
    console.error('Creem: could not match subscription to a user', sub.id);
    return;
  }

  const tier = getTierFromCreemProductId(ref(sub.product));
  if (!tier && !existing.exists) {
    console.error('Creem: unknown product on subscription', sub.id, ref(sub.product));
    return;
  }

  await docRef.set(
    {
      userId,
      ...(tier ? { tier: tier.tier, storageAmount: tier.storageBytes } : {}),
      status,
      provider: 'creem',
      creemSubscriptionId: sub.id,
      creemCustomerId: ref(sub.customer) ?? null,
      currentPeriodEnd: sub.current_period_end_date ? new Date(sub.current_period_end_date) : null,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true }
  );

  await db.collection('users').doc(userId).update({
    subscriptionIds: FieldValue.arrayUnion(docId),
    ...(ref(sub.customer) ? { creemCustomerId: ref(sub.customer) } : {}),
  });

  await recalculateStorageLimit(userId);
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifyCreemSignature(raw, request.headers.get('creem-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: CreemEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
  }

  // Idempotency: Creem retries (30s → 1m → 5m → 1h) and events can be resent
  // from the dashboard. create() fails if we have already processed this id.
  const seenRef = db.collection('webhookEvents').doc(`creem_${event.id}`);
  try {
    await seenRef.create({ type: event.eventType, receivedAt: FieldValue.serverTimestamp() });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.eventType) {
      case 'subscription.active':
      case 'subscription.paid':
      case 'subscription.trialing':
      case 'subscription.update':
      case 'subscription.scheduled_cancel':
      case 'subscription.past_due':
        await upsertSubscription(event.object as CreemSubscription, 'active');
        break;
      case 'subscription.canceled':
      case 'subscription.expired':
      case 'subscription.paused':
        await upsertSubscription(event.object as CreemSubscription, 'cancelled');
        break;
      case 'checkout.completed':
        // The subscription.* event that follows carries everything we need.
        break;
      case 'refund.created':
      case 'dispute.created':
        console.warn(`Creem ${event.eventType}:`, event.object?.id);
        break;
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Creem webhook processing failed:', error);
    // Let Creem retry: forget the event so the retry is not treated as a dup.
    await seenRef.delete().catch(() => {});
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

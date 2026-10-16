import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { initAdmin, db } from '@/lib/firebase-admin';
import { STORAGE_TIERS } from '@myphoto/shared';
import { recalculateStorageLimit } from '@/lib/storage-limit';

export const dynamic = 'force-dynamic';

// Product Secret Key from the Freemius dashboard (Settings → Keys).
const FREEMIUS_SECRET_KEY = process.env.FREEMIUS_SECRET_KEY!;

/**
 * Freemius webhook payload. Freemius nests the affected entities under
 * `objects`, keyed by type; which keys are present depends on the event.
 * See https://freemius.com/help/documentation/selling-with-freemius/webhooks/
 */
interface FreemiusWebhookEvent {
  id: string;
  type: string; // e.g. "license.created", "license.plan.changed", "subscription.cancelled"
  created: string;
  objects?: {
    license?: {
      id: string | number;
      plan_id?: string | number;
      expiration?: string | null;
      is_cancelled?: boolean;
    };
    subscription?: {
      id: string | number;
      plan_id?: string | number;
      next_payment?: string | null;
    };
    plan?: { id: string | number };
    user?: { id: string | number; email?: string };
  };
}

/**
 * Verify the `x-signature` header — HMAC-SHA256 of the raw body keyed by the
 * product Secret Key, hex-encoded. Mirrors the Paddle route's constant-time
 * compare so a length/format mismatch can't throw.
 */
function verifyWebhookSignature(payload: string, signature: string | null): boolean {
  if (!signature || !FREEMIUS_SECRET_KEY) return false;

  try {
    // Some Freemius setups prefix the digest with "sha256="; tolerate both.
    const provided = signature.includes('=') ? signature.split('=').pop()! : signature;
    const computed = createHmac('sha256', FREEMIUS_SECRET_KEY).update(payload).digest('hex');

    const a = Buffer.from(computed);
    const b = Buffer.from(provided);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function getTierFromFreemiusPlanId(planId: string | number | undefined): number | null {
  if (planId === undefined || planId === null) return null;
  const id = String(planId);
  const tier = STORAGE_TIERS.find((t) => t.freemiusPlanId && t.freemiusPlanId === id);
  return tier ? tier.tier : null;
}

export async function POST(request: NextRequest) {
  initAdmin();

  try {
    const payload = await request.text();
    const signature = request.headers.get('x-signature');

    if (!verifyWebhookSignature(payload, signature)) {
      console.error('Invalid Freemius webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event: FreemiusWebhookEvent = JSON.parse(payload);
    console.log('Received Freemius webhook:', event.type, event.id);

    switch (event.type) {
      // License lifecycle — Freemius' primary subscription signals for SaaS.
      case 'license.created':
      case 'subscription.created':
        await handleActivated(event);
        break;

      case 'license.updated':
      case 'license.extended':
      case 'license.plan.changed':
      case 'subscription.updated':
        await handleUpdated(event);
        break;

      case 'license.cancelled':
      case 'license.expired':
      case 'subscription.cancelled':
        await handleCancelled(event);
        break;

      case 'subscription.renewal.failed':
        await handlePaymentFailed(event);
        break;

      default:
        console.log('Unhandled Freemius webhook event:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Freemius webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/** Resolve the Firebase user id from the Freemius buyer email. */
async function findUserIdByEmail(email?: string): Promise<string | null> {
  if (!email) return null;
  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

/** Stable subscription doc id — prefer the Freemius subscription, fall back to license. */
function subscriptionDocId(event: FreemiusWebhookEvent): string | null {
  const subId = event.objects?.subscription?.id;
  const licId = event.objects?.license?.id;
  const id = subId ?? licId;
  return id !== undefined ? `fs_${String(id)}` : null;
}

function resolvePlanId(event: FreemiusWebhookEvent): string | number | undefined {
  return (
    event.objects?.plan?.id ??
    event.objects?.subscription?.plan_id ??
    event.objects?.license?.plan_id
  );
}

function resolvePeriodEnd(event: FreemiusWebhookEvent): Date | null {
  const raw = event.objects?.subscription?.next_payment ?? event.objects?.license?.expiration;
  return raw ? new Date(raw) : null;
}

async function handleActivated(event: FreemiusWebhookEvent) {
  const docId = subscriptionDocId(event);
  if (!docId) return;

  const tier = getTierFromFreemiusPlanId(resolvePlanId(event));
  if (tier === null) {
    console.error('Unknown Freemius plan ID on', event.type, resolvePlanId(event));
    return;
  }
  const tierConfig = STORAGE_TIERS.find((t) => t.tier === tier);
  if (!tierConfig) return;

  const userId = await findUserIdByEmail(event.objects?.user?.email);
  if (!userId) {
    console.error('Could not match Freemius buyer to a user:', event.objects?.user?.email);
    return;
  }

  await db.collection('subscriptions').doc(docId).set({
    userId,
    tier,
    storageAmount: tierConfig.storageBytes,
    status: 'active',
    provider: 'freemius',
    freemiusLicenseId: event.objects?.license?.id != null ? String(event.objects.license.id) : null,
    freemiusSubscriptionId:
      event.objects?.subscription?.id != null ? String(event.objects.subscription.id) : null,
    currentPeriodEnd: resolvePeriodEnd(event),
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection('users').doc(userId).update({
    subscriptionIds: FieldValue.arrayUnion(docId),
    freemiusUserId: event.objects?.user?.id != null ? String(event.objects.user.id) : null,
  });

  await recalculateStorageLimit(userId);
  console.log(`Freemius subscription ${docId} activated for user ${userId} (tier ${tier})`);
}

async function handleUpdated(event: FreemiusWebhookEvent) {
  const docId = subscriptionDocId(event);
  if (!docId) return;

  const subDoc = await db.collection('subscriptions').doc(docId).get();
  // A plan change can arrive before the create event we missed — upsert instead.
  if (!subDoc.exists) {
    await handleActivated(event);
    return;
  }

  const tier = getTierFromFreemiusPlanId(resolvePlanId(event));
  const tierConfig = tier !== null ? STORAGE_TIERS.find((t) => t.tier === tier) : null;

  await db.collection('subscriptions').doc(docId).update({
    ...(tierConfig ? { tier, storageAmount: tierConfig.storageBytes } : {}),
    status: 'active',
    currentPeriodEnd: resolvePeriodEnd(event),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await recalculateStorageLimit(subDoc.data()!.userId);
  console.log(`Freemius subscription ${docId} updated`);
}

async function handleCancelled(event: FreemiusWebhookEvent) {
  const docId = subscriptionDocId(event);
  if (!docId) return;

  const subDoc = await db.collection('subscriptions').doc(docId).get();
  if (!subDoc.exists) return;

  await db.collection('subscriptions').doc(docId).update({
    status: 'cancelled',
    updatedAt: FieldValue.serverTimestamp(),
  });

  await recalculateStorageLimit(subDoc.data()!.userId);
  console.log(`Freemius subscription ${docId} cancelled`);
}

async function handlePaymentFailed(event: FreemiusWebhookEvent) {
  // Could notify the user; for now log for analytics parity with the Paddle route.
  console.log('Freemius payment/renewal failed:', event.id);
}

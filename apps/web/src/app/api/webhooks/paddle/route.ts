import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { initAdmin, db } from '@/lib/firebase-admin';
import { STORAGE_TIERS, FREE_STORAGE_LIMIT } from '@myphoto/shared';

export const dynamic = 'force-dynamic';

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET!;

interface PaddleWebhookEvent {
  event_type: string;
  event_id: string;
  occurred_at: string;
  data: {
    id: string;
    customer_id: string;
    status: string;
    items: Array<{
      price: {
        id: string;
        product_id: string;
      };
      quantity: number;
    }>;
    current_billing_period?: {
      starts_at: string;
      ends_at: string;
    };
    custom_data?: {
      user_id?: string;
    };
  };
}

function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature || !PADDLE_WEBHOOK_SECRET) {
    return false;
  }

  try {
    const parts = signature.split(';');
    const timestampPart = parts.find((p) => p.startsWith('ts='));
    const signaturePart = parts.find((p) => p.startsWith('h1='));

    if (!timestampPart || !signaturePart) {
      return false;
    }

    const timestamp = timestampPart.split('=')[1];
    const expectedSignature = signaturePart.split('=')[1];

    const signedPayload = `${timestamp}:${payload}`;
    const hmac = createHmac('sha256', PADDLE_WEBHOOK_SECRET);
    hmac.update(signedPayload);
    const computedSignature = hmac.digest('hex');

    return timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

function getTierFromProductId(productId: string): number | null {
  const tier = STORAGE_TIERS.find((t) =>
    t.paddleProductId === productId ||
    t.paddleProductIdAI === productId ||
    t.paddleQuarterlyId === productId ||
    t.paddleQuarterlyIdAI === productId ||
    t.paddleSemiAnnualId === productId ||
    t.paddleSemiAnnualIdAI === productId ||
    t.paddleYearlyId === productId ||
    t.paddleYearlyIdAI === productId
  );
  return tier ? tier.tier : null;
}

export async function POST(request: NextRequest) {
  // Initialize Firebase Admin (lazy)
  initAdmin();

  try {
    const payload = await request.text();
    const signature = request.headers.get('paddle-signature');

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event: PaddleWebhookEvent = JSON.parse(payload);
    console.log('Received Paddle webhook:', event.event_type, event.event_id);

    switch (event.event_type) {
      case 'subscription.created':
      case 'subscription.activated':
        await handleSubscriptionCreated(event);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(event);
        break;

      case 'subscription.paused':
        await handleSubscriptionPaused(event);
        break;

      case 'subscription.resumed':
        await handleSubscriptionResumed(event);
        break;

      case 'transaction.completed':
        await handleTransactionCompleted(event);
        break;

      case 'transaction.payment_failed':
        await handlePaymentFailed(event);
        break;

      default:
        console.log('Unhandled webhook event:', event.event_type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(event: PaddleWebhookEvent) {
  const { id: subscriptionId, customer_id, items, custom_data, current_billing_period } = event.data;

  if (!items?.length) return;

  const productId = items[0].price.product_id;
  const tier = getTierFromProductId(productId);

  if (tier === null) {
    console.error('Unknown product ID:', productId);
    return;
  }

  const tierConfig = STORAGE_TIERS.find((t) => t.tier === tier);
  if (!tierConfig) return;

  // Find user by custom data or customer mapping
  let userId = custom_data?.user_id;

  if (!userId) {
    // Try to find user by Paddle customer ID
    const userQuery = await db
      .collection('users')
      .where('paddleCustomerId', '==', customer_id)
      .limit(1)
      .get();

    if (!userQuery.empty) {
      userId = userQuery.docs[0].id;
    }
  }

  if (!userId) {
    console.error('Could not find user for subscription:', subscriptionId);
    return;
  }

  // Create subscription document
  await db.collection('subscriptions').doc(subscriptionId).set({
    userId,
    tier,
    storageAmount: tierConfig.storageBytes,
    status: 'active',
    paddleCustomerId: customer_id,
    currentPeriodEnd: current_billing_period?.ends_at
      ? new Date(current_billing_period.ends_at)
      : null,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Update user document
  await db.collection('users').doc(userId).update({
    subscriptionIds: FieldValue.arrayUnion(subscriptionId),
    paddleCustomerId: customer_id,
  });

  // Recalculate user storage limit
  await recalculateStorageLimit(userId);

  console.log(`Subscription ${subscriptionId} created for user ${userId}`);
}

async function handleSubscriptionUpdated(event: PaddleWebhookEvent) {
  const { id: subscriptionId, items, status, current_billing_period } = event.data;

  if (!items?.length) return;

  const productId = items[0].price.product_id;
  const tier = getTierFromProductId(productId);

  if (tier === null) return;

  const tierConfig = STORAGE_TIERS.find((t) => t.tier === tier);
  if (!tierConfig) return;

  const subDoc = await db.collection('subscriptions').doc(subscriptionId).get();
  if (!subDoc.exists) return;

  await db.collection('subscriptions').doc(subscriptionId).update({
    tier,
    storageAmount: tierConfig.storageBytes,
    status: status === 'active' ? 'active' : status,
    currentPeriodEnd: current_billing_period?.ends_at
      ? new Date(current_billing_period.ends_at)
      : null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const userId = subDoc.data()!.userId;
  await recalculateStorageLimit(userId);

  console.log(`Subscription ${subscriptionId} updated`);
}

async function handleSubscriptionCanceled(event: PaddleWebhookEvent) {
  const { id: subscriptionId } = event.data;

  const subDoc = await db.collection('subscriptions').doc(subscriptionId).get();
  if (!subDoc.exists) return;

  await db.collection('subscriptions').doc(subscriptionId).update({
    status: 'cancelled',
    updatedAt: FieldValue.serverTimestamp(),
  });

  const userId = subDoc.data()!.userId;
  await recalculateStorageLimit(userId);

  console.log(`Subscription ${subscriptionId} canceled`);
}

async function handleSubscriptionPaused(event: PaddleWebhookEvent) {
  const { id: subscriptionId } = event.data;

  const subDoc = await db.collection('subscriptions').doc(subscriptionId).get();
  if (!subDoc.exists) return;

  await db.collection('subscriptions').doc(subscriptionId).update({
    status: 'paused',
    updatedAt: FieldValue.serverTimestamp(),
  });

  const userId = subDoc.data()!.userId;
  await recalculateStorageLimit(userId);

  console.log(`Subscription ${subscriptionId} paused`);
}

async function handleSubscriptionResumed(event: PaddleWebhookEvent) {
  const { id: subscriptionId } = event.data;

  const subDoc = await db.collection('subscriptions').doc(subscriptionId).get();
  if (!subDoc.exists) return;

  await db.collection('subscriptions').doc(subscriptionId).update({
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  });

  const userId = subDoc.data()!.userId;
  await recalculateStorageLimit(userId);

  console.log(`Subscription ${subscriptionId} resumed`);
}

async function handleTransactionCompleted(event: PaddleWebhookEvent) {
  // Log transaction for analytics
  console.log('Transaction completed:', event.event_id);
}

async function handlePaymentFailed(event: PaddleWebhookEvent) {
  // Could send notification to user
  console.log('Payment failed:', event.event_id);
}

async function recalculateStorageLimit(userId: string) {
  // Get all active subscriptions for user
  const subsSnapshot = await db
    .collection('subscriptions')
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .get();

  // Sum up storage from all active subscriptions (stacking)
  let totalSubscriptionStorage = 0;
  for (const doc of subsSnapshot.docs) {
    const data = doc.data();
    totalSubscriptionStorage += data.storageAmount || 0;
  }

  // Add free tier storage
  const totalStorage = FREE_STORAGE_LIMIT + totalSubscriptionStorage;

  // Update user document
  await db.collection('users').doc(userId).update({
    storageLimit: totalStorage,
  });

  console.log(`Updated storage limit for user ${userId}: ${totalStorage} bytes`);
}

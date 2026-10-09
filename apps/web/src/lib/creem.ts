import { createHmac, timingSafeEqual } from 'crypto';
import {
  findTierByCreemProductId,
  getTierCreemProductId,
  type BillingPeriod,
  type StorageTier,
} from '@myphoto/shared';

/**
 * Creem (merchant of record) REST client — plain fetch, no SDK, so nothing
 * new lands in node_modules (Dropbox locks it on install).
 *
 * Env:
 *   CREEM_API_KEY         creem_test_… (sandbox) or creem_… (live)
 *   CREEM_WEBHOOK_SECRET  from Dashboard → Developers → Webhooks
 * The API host follows the key prefix, so a test key can never hit live.
 */

function apiKey(): string {
  const key = process.env.CREEM_API_KEY;
  if (!key) throw new Error('CREEM_API_KEY is not set');
  return key;
}

export function creemIsTestMode(): boolean {
  return (process.env.CREEM_API_KEY || '').startsWith('creem_test_');
}

function apiBase(): string {
  return creemIsTestMode() ? 'https://test-api.creem.io' : 'https://api.creem.io';
}

async function creemFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { 'x-api-key': apiKey(), 'Content-Type': 'application/json', ...(init.headers || {}) },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message.join('; ') : body?.message || res.statusText;
    throw new Error(`Creem ${path} ${res.status}: ${msg} (trace ${body?.trace_id ?? '-'})`);
  }
  return body as T;
}

export function getCreemProductId(tier: StorageTier, period: BillingPeriod): string {
  return getTierCreemProductId(tier, period);
}

export function getTierFromCreemProductId(
  productId: string | undefined
): { tier: StorageTier; period: BillingPeriod } | null {
  return findTierByCreemProductId(productId || '');
}

export async function createCreemCheckout(params: {
  productId: string;
  userId: string;
  email?: string;
  successUrl: string;
  requestId: string;
  discountCode?: string;
  /** One-time products only: price override in euro cents (min 100). */
  customPriceCents?: number;
  metadata?: Record<string, string | number>;
}): Promise<{ id: string; checkout_url: string }> {
  return creemFetch('/v1/checkouts', {
    method: 'POST',
    body: JSON.stringify({
      product_id: params.productId,
      request_id: params.requestId,
      success_url: params.successUrl,
      ...(params.email ? { customer: { email: params.email } } : {}),
      ...(params.discountCode ? { discount_code: params.discountCode } : {}),
      ...(params.customPriceCents ? { custom_price: params.customPriceCents, units: 1 } : {}),
      // userId travels with the checkout and comes back on every
      // subscription webhook — the buyer is matched by id, not by email.
      metadata: { userId: params.userId, ...(params.metadata || {}) },
    }),
  });
}

/**
 * Cancel a subscription. 'immediate' is used on account deletion;
 * 'scheduled' (user-initiated cancel) keeps access until the paid period
 * ends, and Creem then sends subscription.canceled.
 */
export async function cancelCreemSubscription(
  subscriptionId: string,
  mode: 'immediate' | 'scheduled' = 'immediate'
): Promise<void> {
  await creemFetch(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify(mode === 'scheduled' ? { mode, onExecute: 'cancel' } : { mode }),
  });
}

/**
 * Move a subscription to another product (another plan and/or period).
 * Retention downgrades use 'proration-none' so nothing is charged or
 * refunded mid-period. Verify downgrade/period switches in the sandbox.
 */
export async function changeCreemSubscriptionProduct(
  subscriptionId: string,
  productId: string,
  updateBehavior: 'proration-charge-immediately' | 'proration-charge' | 'proration-none' = 'proration-none'
): Promise<void> {
  await creemFetch(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}/upgrade`, {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, update_behavior: updateBehavior }),
  });
}

/** Hosted customer portal link (invoices, card, cancel). */
export async function createCreemBillingPortal(customerId: string): Promise<string> {
  const res = await creemFetch<{ customer_portal_link: string }>('/v1/customers/billing', {
    method: 'POST',
    body: JSON.stringify({ customer_id: customerId }),
  });
  return res.customer_portal_link;
}

/** HMAC-SHA256 of the raw body, hex, in the `creem-signature` header. */
export function verifyCreemSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.CREEM_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const computed = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(computed);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

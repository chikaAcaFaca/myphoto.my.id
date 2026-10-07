/**
 * Freemius Checkout — embedded overlay modal.
 *
 * We load the Checkout JS from Freemius' CDN (global `FS`) instead of adding the
 * `@freemius/checkout` npm package. This deliberately avoids an install step:
 * the monorepo lives in Dropbox, which locks `node_modules` during `pnpm`
 * installs, so a script tag is the friction-free path.
 *
 * Docs: https://freemius.com/help/documentation/saas-sdk/checkout-js-sdk/usage/
 */

interface FreemiusCheckoutConfig {
  product_id: string;
  public_key: string;
}

interface FreemiusHandler {
  open(options: Record<string, unknown>): void;
  close(): void;
}

declare global {
  interface Window {
    FS?: {
      Checkout: new (config: FreemiusCheckoutConfig) => FreemiusHandler;
    };
  }
}

const CDN_SRC = 'https://checkout.freemius.com/checkout.min.js';

let scriptPromise: Promise<void> | null = null;

/** Inject the Freemius Checkout script once; resolves when `window.FS` exists. */
export function loadFreemius(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.FS) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CDN_SRC}"]`
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Freemius Checkout failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = CDN_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Freemius Checkout failed to load'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export interface OpenFreemiusOptions {
  /** Freemius plan ID (StorageTier.freemiusPlanId). */
  planId: string;
  /** Our period maps to Freemius' billing_cycle: yearly → 'annual'. */
  billingCycle: 'monthly' | 'annual';
  /** Pre-fill + lock the buyer email to the logged-in account email so the
   *  webhook can match the purchase back to the user by email. */
  userEmail: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

/** Open the overlay checkout. Returns false if the env/SDK isn't ready. */
export function openFreemiusCheckout(opts: OpenFreemiusOptions): boolean {
  const productId = process.env.NEXT_PUBLIC_FREEMIUS_PRODUCT_ID;
  const publicKey = process.env.NEXT_PUBLIC_FREEMIUS_PUBLIC_KEY;

  if (!window.FS || !productId || !publicKey || !opts.planId) return false;

  const handler = new window.FS.Checkout({
    product_id: productId,
    public_key: publicKey,
  });

  handler.open({
    plan_id: opts.planId,
    billing_cycle: opts.billingCycle,
    licenses: 1,
    user_email: opts.userEmail,
    readonly_user: true,
    success: () => opts.onSuccess?.(),
    afterClose: () => opts.onClose?.(),
  });

  return true;
}

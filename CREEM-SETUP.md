# Creem (merchant of record) — setup

The code is ready. It's switched on with `NEXT_PUBLIC_PAYMENT_PROVIDER=creem`, and Paddle and Freemius stay in place, inactive.

## 1. Creem dashboard (start in **test mode**)
1. Create one **recurring product per tier and per period that tier is sold in**. Currency EUR, tax category `saas`, billing period `every-month` / `every-three-months` / `every-six-months` / `every-year`.

   Small tiers are not sold monthly, because the per-payment fee (3.9% + $0.40) would take 18–55% of a €0.69–€2.49 charge:

   | Tier | 3 months | 6 months | Yearly | Monthly |
   |---|---|---|---|---|
   | MyDisk Lite 24 GB | – | – | €4.99 | – |
   | Mini 32 GB | – | €4.99 | €6.90 | – |
   | Basic 64 GB | – | €5.94 | €9.99 | – |
   | Starter 150 GB | €7.47 | €14.94 | €24.90 | – |
   | Plus 250 GB | €11.97 | €23.94 | €39.90 | – |
   | Pro 500 GB | €22.47 | €44.94 | €74.90 | €7.49 |
   | Pro+ 750 GB | €32.97 | €65.94 | €109.90 | €10.99 |
   | Max 1 TB | €43.47 | €86.94 | €144.90 | €14.49 |
   | Ultra 2 TB | €74.97 | €149.94 | €249.90 | €24.99 |

   If Creem grants a flat ≤10% rate for small payments, set `MICRO_TX_MONTHLY_ENABLED = true` in `packages/shared/src/constants/index.ts` and create the monthly products for every tier too.
2. Copy each `prod_…` id into `packages/shared/src/constants/index.ts`, on the matching tier: `creemMonthlyProductId` / `creemQuarterlyProductId` / `creemSemiannualProductId` / `creemYearlyProductId`.
3. Create one **one-time product "MyPhoto Archive"** (any price, e.g. €4.99). The checkout overrides its price per purchase with `custom_price`. Put its id in `CREEM_ARCHIVE_PRODUCT_ID`.
4. Go to Developers → Webhooks → add `https://myphotomy.space/api/webhooks/creem` and copy the secret. Enable at least `checkout.completed` and all `subscription.*` events.
5. Go to Developers → API keys and copy the key (`creem_test_…` for test, `creem_…` for live).

## 2. Vercel env (Production + Preview)
```
NEXT_PUBLIC_PAYMENT_PROVIDER=creem
CREEM_API_KEY=creem_test_...        # API host follows the prefix (test-api vs api)
CREEM_WEBHOOK_SECRET=...
CREEM_ARCHIVE_PRODUCT_ID=prod_...   # one-time "MyPhoto Archive" product
CRON_SECRET=<long random string>    # Vercel Cron sends it to /api/cron/over-quota
BREVO_API_KEY=xkeysib-...          # brevo.com, after authenticating myphotomy.space
EMAIL_FROM=MyPhoto <noreply@myphotomy.space>
```
Without `BREVO_API_KEY` no warning emails go out, so **files are never auto-deleted**. Deletion requires a warning sent at least 7 days earlier.

## 3. What the code does
- `POST /api/checkout/creem {tier, period}` creates the checkout on the server with `metadata.userId`. The buyer is matched by uid, not by email. It rejects periods the tier is not sold in.
- `/api/webhooks/creem`:
  - verifies `creem-signature` (HMAC-SHA256) and skips events it has already processed (`webhookEvents/creem_<id>`);
  - writes `subscriptions/cr_<subId>` (tier, `billingPeriod`, `cancelAtPeriodEnd`) and then calls `recalculateStorageLimit`;
  - on `checkout.completed` with `metadata.kind = 'archive'`, extends `users.archiveUntil`.
- `GET /api/billing/subscription`, `POST /api/billing/portal`, `POST /api/billing/change` (retention offer: moves the subscription with `/upgrade`), and `POST /api/billing/cancel` (`mode: scheduled`, so the user keeps access until the period ends). All of this appears under Settings → Storage.
- **Over-quota lifecycle** (`apps/web/src/lib/over-quota.ts`, daily cron `/api/cron/over-quota`):
  1. Subscription or archive ends and the files exceed the free allowance → read-only.
  2. Warning emails go out on days 0/30/60/83/89, linking to `/keep-files`.
  3. On day 90 the newest files over the limit are deleted.
  4. `/keep-files` offers the archive (price ≥ 3× Wasabi cost, `getArchivePrice`), or the plan when that is no dearer, plus "download everything".
- Account deletion cancels active Creem subscriptions immediately.

**Test in the sandbox before going live:** a downgrade or period switch through `/upgrade` with `proration-none`, `custom_price` on the archive product, and that `scheduled_cancel` arrives after `/cancel`.

## 4. Google Play (important)
The Play build of the Android app is **consumption-only**: no prices, no buy buttons, no links to checkout (`apps/mobile/src/lib/distribution.ts`). Selling happens only on the web. The sideloaded APK from the site can keep the in-app checkout: build it with `EXPO_PUBLIC_DISTRIBUTION=direct`.

## 5. Claude Code MCP (optional)
```
claude mcp add creem -- npx -y --package creem -- mcp start --api-key creem_test_XXX --server test
```
Use a test key with `--server test`. A full-access key lets the agent issue refunds and cancel subscriptions.

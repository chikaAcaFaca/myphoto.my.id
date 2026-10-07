# Creem (merchant of record) — setup

The code is ready. It's switched on with `NEXT_PUBLIC_PAYMENT_PROVIDER=creem`, and Paddle and Freemius stay in place, inactive.

## 1. Creem dashboard (start in **test mode**)
1. Create one **recurring product per tier and period**: Mini monthly, Mini yearly, and so on. Currency EUR, tax category `saas`.
2. Copy each `prod_…` id into `packages/shared/src/constants/index.ts` (`creemMonthlyProductId` / `creemYearlyProductId` on the matching tier). Leave `creemMonthlyProductId` empty on yearly-only tiers.
3. Go to Developers → Webhooks → add `https://myphotomy.space/api/webhooks/creem` and copy the secret.
4. Go to Developers → API keys and copy the key (`creem_test_…` for test, `creem_…` for live).

## 2. Vercel env (Production + Preview)
```
NEXT_PUBLIC_PAYMENT_PROVIDER=creem
CREEM_API_KEY=creem_test_...        # API host follows the prefix (test-api vs api)
CREEM_WEBHOOK_SECRET=...
```

## 3. What the code does
- `POST /api/checkout/creem` creates the checkout on the server with `metadata.userId`. The buyer is matched by uid, not by email.
- `/api/webhooks/creem` verifies `creem-signature` (HMAC-SHA256) and skips events it has already processed (`webhookEvents/creem_<id>`). It writes `subscriptions/cr_<subId>` in the same shape as Paddle/Freemius and then calls `recalculateStorageLimit`.
- `POST /api/billing/portal` returns Creem's hosted billing page link (invoices, card, cancel).
- Account deletion cancels active Creem subscriptions immediately.

## 4. Google Play (important)
The Play build of the Android app is **consumption-only**: no prices, no buy buttons, no links to checkout (`apps/mobile/src/lib/distribution.ts`). Selling happens only on the web. The sideloaded APK from the site can keep the in-app checkout: build it with `EXPO_PUBLIC_DISTRIBUTION=direct`.

## 5. Claude Code MCP (optional)
```
claude mcp add creem -- npx -y --package creem -- mcp start --api-key creem_test_XXX --server test
```
Use a test key with `--server test`. A full-access key lets the agent issue refunds and cancel subscriptions.

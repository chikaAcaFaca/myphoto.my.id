# Freemius — setup i go-live (priprema završena u kodu)

Paddle je ostao netaknut kao fallback. Freemius je dodat **paralelno** i aktivira se
jednim env prekidačem. Sve niže je ono što treba uraditi u Freemius dashboardu +
Vercel env-u; kod je već spreman.

## Šta je urađeno u kodu

| Fajl | Promena |
|------|---------|
| `packages/shared/src/types/index.ts` | `StorageTier.freemiusPlanId?`; `Subscription.provider/freemiusLicenseId/freemiusSubscriptionId` |
| `packages/shared/src/constants/index.ts` | `freemiusPlanId: ''` na svih 10 tierova (čeka ID-jeve) |
| `apps/web/src/lib/freemius-checkout.ts` | CDN loader + `openFreemiusCheckout()` (overlay modal, bez npm dep) |
| `apps/web/src/app/checkout/page.tsx` | Provider prekidač `NEXT_PUBLIC_PAYMENT_PROVIDER`; Paddle putanja netaknuta |
| `apps/web/src/app/api/webhooks/freemius/route.ts` | Novi webhook (`x-signature` HMAC-SHA256), piše u istu `subscriptions` kolekciju |
| `turbo.json` | Nove env varijable u build env listi |

`recalculateStorageLimit()` (`apps/web/src/lib/storage-limit.ts`) je **nepromenjen** —
Freemius webhook piše isti oblik `subscriptions` dokumenta kao Paddle, pa obračun
prostora radi automatski.

## 1. Freemius dashboard

1. Registruj se → **Add Product** → tip **SaaS / App** (NE WordPress).
2. **Plans**: napravi po jedan plan za svaki plaćeni tier (MyDisk Lite, Mini, Basic,
   Starter, Plus, Pro, Pro+, Max, Ultra). Free tier ne treba plan.
3. U svakom planu → **Pricing**: dodaj **Monthly** i **Annual** cenu (iznosi iz
   `STORAGE_TIERS`). Jedan plan nosi oba ciklusa — checkout bira ciklus preko
   `billing_cycle` (`monthly` / `annual`).
4. **Settings → Keys**: prepiši **Product ID**, **Public Key** i **Secret Key**.

## 2. Upiši plan ID-jeve u kod

U `packages/shared/src/constants/index.ts`, za svaki tier popuni `freemiusPlanId`
vrednošću iz dashboarda (string). Webhook mapira `plan_id → tier` preko tog polja.

> Treba ti automatizacija? Freemius ima REST API — mogu da napišem skript koji čita
> `STORAGE_TIERS` i kreira/ažurira planove + vraća ID-jeve. (Nema zvaničan MCP.)

## 3. Env varijable (Vercel + lokalno `.env`)

```
NEXT_PUBLIC_PAYMENT_PROVIDER=freemius      # 'paddle' (default) ili 'freemius'
NEXT_PUBLIC_FREEMIUS_PRODUCT_ID=...        # iz dashboarda
NEXT_PUBLIC_FREEMIUS_PUBLIC_KEY=pk_...     # iz dashboarda
FREEMIUS_SECRET_KEY=sk_...                 # SAMO server — potpis webhooka
```

Dok je `NEXT_PUBLIC_PAYMENT_PROVIDER` nepostavljen ili `paddle`, sve radi po starom.

## 4. Webhook

U Freemius dashboardu → **Webhooks** → dodaj endpoint:

```
https://myphotomy.space/api/webhooks/freemius
```

Pretplati ga na: `license.created`, `license.updated`, `license.plan.changed`,
`license.cancelled`, `license.expired`, `subscription.cancelled`,
`subscription.renewal.failed`. Potpis se proverava `x-signature` headerom protiv
`FREEMIUS_SECRET_KEY`.

## 5. Mobilni (Android)

`apps/mobile/app/pricing.tsx` već otvara `${API_URL}/checkout?tier=&period=`, pa čim
web checkout pređe na Freemius, mobilni automatski prati. Za in-app webview umesto
spoljnog browsera — dodati WebView ekran kasnije.

> ⚠️ **Google Play**: digitalne pretplate zvanično traže Play Billing. Freemius
> checkout u webview-u nosi rizik odbijanja — proveriti pre objave.

## 6. Test (end-to-end)

1. Postavi env na Freemius **sandbox/test** ključeve, `NEXT_PUBLIC_PAYMENT_PROVIDER=freemius`.
2. `pnpm --filter web dev` → `/checkout?tier=4&period=yearly` (uloguj se prvo).
3. Klik na plaćanje → otvara se Freemius overlay sa zaključanim email-om naloga.
4. Završi test-kupovinu → webhook upisuje `subscriptions/fs_*` i `recalculateStorageLimit`
   diže `storageLimit`. Proveri u Firestore-u i na `/photos`.
5. Otkazivanje u dashboardu → `status: 'cancelled'`, prostor se vraća na formulu.

## Otvoreno pitanje — matchovanje korisnika

Freemius vezuje kupovinu po **email-u** (checkout šalje `readonly_user=true` sa email-om
naloga, webhook traži usera po `users.email`). Ako korisnik plati drugim email-om,
match neće proći. Paddle je to rešavao `custom_data.user_id`. Ako želiš isti nivo
sigurnosti, dodajemo prosleđivanje user ID-ja kroz Freemius checkout custom polja —
javi pa to doradim.

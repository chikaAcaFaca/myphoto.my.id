# Freemius — cenovnik + mejl za procenu provizije

Cene su iz live koda (`packages/shared/src/constants/index.ts`). USD kolona je
**približna**, po kursu €1 = $1.08 — samo da se vidi koji SKU-ovi padaju ispod $10.
Naplata je u EUR.

## Pun cenovnik (svi SKU-ovi)

| Tier | Storage | Mesečno (EUR) | ≈ USD/mes | Godišnje (EUR) | ≈ USD/god | < $10? |
|------|---------|--------------:|----------:|---------------:|----------:|:------:|
| Free | 1 GB | 0.00 | — | 0.00 | — | — |
| MyDisk Lite | 24 GB | — (samo god.) | — | 3.99 | $4.31 | ✅ |
| Mini | 32 GB | 0.69 | $0.75 | 6.90 | $7.45 | ✅ |
| Basic | 64 GB | 0.99 | $1.07 | 9.90 | $10.69 | ✅ mes |
| Starter | 150 GB | 2.49 | $2.69 | 24.90 | $26.89 | ✅ mes |
| Plus | 250 GB | 3.99 | $4.31 | 39.90 | $43.09 | ✅ mes |
| Pro | 500 GB | 7.49 | $8.09 | 74.90 | $80.89 | ✅ mes |
| Pro+ | 750 GB | 10.99 | $11.87 | 109.90 | $118.69 | — |
| Max | 1 TB | 14.49 | $15.65 | 144.90 | $156.49 | — |
| Ultra | 2 TB | 24.99 | $26.99 | 249.90 | $269.89 | — |

**Ispod €10 po transakciji:** svi mesečni do Pro (€7.49), plus godišnji MyDisk Lite,
Mini i Basic. To je većina ulaznih SKU-ova → fiksni deo provizije nas najviše boli baš tu.

---

## Mejl za Freemius (engleski — kopiraj/pošalji)

**Subject:** Fee estimate for a SaaS subscription product with low-priced (micro) tiers

Hello Freemius team,

We're launching **MyPhoto** (myphotomy.space), a SaaS cloud photo, video and file
backup service sold as recurring subscriptions (web + Android, EU customers, billed in
EUR). We're choosing our Merchant of Record and would like Freemius to be it.

Our pricing is built around many **low-priced entry tiers** — most of our monthly SKUs
are under $10, which is why the per-transaction fee structure is critical for us. Full
price list below (USD is approximate at €1 = $1.08; we charge in EUR):

| Plan | Storage | Monthly (EUR) | Annual (EUR) |
|------|---------|--------------:|-------------:|
| MyDisk Lite | 24 GB | annual only | 3.99 |
| Mini | 32 GB | 0.69 | 6.90 |
| Basic | 64 GB | 0.99 | 9.90 |
| Starter | 150 GB | 2.49 | 24.90 |
| Plus | 250 GB | 3.99 | 39.90 |
| Pro | 500 GB | 7.49 | 74.90 |
| Pro+ | 750 GB | 10.99 | 109.90 |
| Max | 1 TB | 14.49 | 144.90 |
| Ultra | 2 TB | 24.99 | 249.90 |

Could you please help us with two things:

1. **An estimated effective fee per price point** (including payment-gateway costs), so
   we can model our net revenue per SKU and price competitively.

2. Most importantly: for **transactions up to €10** (≈ $11), is it possible to apply a
   **flat 10% fee with no fixed per-transaction component**? With prices as low as €0.69,
   a fixed cents-based fee takes a disproportionate share, so a clean percentage-only
   rate on micro-transactions would let us keep these entry tiers viable.

We expect the majority of volume to come from these sub-$10 monthly subscriptions, with
upsells to annual and higher tiers over time.

Thank you — looking forward to your estimate.

Best regards,
Aleksandar Jovanović
MyPhoto / myphotomy.space

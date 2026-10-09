import type { BillingPeriod, StorageTier } from '../types';

// Currency
export const CURRENCY_SYMBOL = '€';
export const CURRENCY_CODE = 'EUR';

// Storage Constants
export const BYTES_PER_MB = 1024 * 1024;
export const BYTES_PER_GB = 1024 * 1024 * 1024;
export const BYTES_PER_TB = BYTES_PER_GB * 1024;

// Free tier: 1GB on registration
export const FREE_STORAGE_LIMIT = 1 * BYTES_PER_GB;

// Install bonuses are retired: the free plan is 1GB + referrals only. Kept at
// zero rather than deleted so old call sites compile and grant nothing.
export const APP_INSTALL_BONUS = 0;
export const DESKTOP_INSTALL_BONUS = 0;

// Referrals: the REFERRER gets +250MB for every friend who signs up with their
// link and uploads REFERRAL_QUALIFICATION_BYTES. The new user starts at the
// plain 1GB. 6 referrals x 250MB = 1.5GB, which lands exactly on the 2.5GB
// free ceiling below.
export const REFERRAL_BONUS = 250 * BYTES_PER_MB;
export const MAX_REFERRALS = 6;
export const MAX_REFERRAL_BONUS = REFERRAL_BONUS * MAX_REFERRALS; // 1.5GB
export const REFERRAL_QUALIFICATION_BYTES = 100 * BYTES_PER_MB; // referee must upload 100MB to qualify
export const MAX_FAMILY_MEMBERS_REFERRAL = 6;

// Meme-wall referral: retired, grants nothing (main referral covers it).
export const MEME_REFERRAL_BONUS = 0;
export const MAX_MEME_REFERRAL_BONUS = 0;
export const MEME_QUALIFICATION_UPLOAD_BYTES = 500 * BYTES_PER_MB; // referee must upload 500MB
export const MEME_QUALIFICATION_REFERRALS = 5;                     // referee must refer 5 friends

// Hard ceiling on everything a user can get without paying:
// 1GB registration + up to 6 x 250MB referrals. Enforced in
// recalculateStorageLimit(); admin-granted storage and paid subscriptions
// stack on top of it and are deliberately NOT capped.
export const MAX_FREE_STORAGE = 2.5 * BYTES_PER_GB;

// Legacy — keep for backward compatibility during migration
export const BACKUP_BONUS = APP_INSTALL_BONUS;

// Largest single meme upload (video memes included). Memes also count against
// the author's storageLimit like any other file.
export const MAX_MEME_UPLOAD_SIZE = 100 * BYTES_PER_MB;

// Billing Periods. Discount is vs. paying the reference monthly rate.
export const BILLING_PERIODS = {
  monthly:    { months: 1,  label: 'Mesečno',     labelShort: '1 mes' },
  quarterly:  { months: 3,  label: 'Tromesečno',  labelShort: '3 mes' },
  semiannual: { months: 6,  label: 'Polugodišnje', labelShort: '6 mes' },
  yearly:     { months: 12, label: 'Godišnje',    labelShort: '12 mes' },
} as const;

export const BILLING_PERIOD_ORDER: BillingPeriod[] = ['monthly', 'quarterly', 'semiannual', 'yearly'];
const ALL_PERIODS: BillingPeriod[] = BILLING_PERIOD_ORDER;

// The merchant of record charges ~3.9% + $0.40 per payment, so a €0.69–€2.49
// charge loses 18–55% to fees. Small tiers are therefore sold only in periods
// whose single charge is >= ~€5 (fee <= ~10%). Flip this to true if the
// provider grants a flat <=10% rate for micro-transactions: every paid tier
// then also offers monthly billing.
export const MICRO_TX_MONTHLY_ENABLED = false;

// All features included in every tier (including Free)
export const ALL_FEATURES = [
  'MyPhoto auto-backup slika i videa',
  'MySpace cloud storage za fajlove',
  'AI pretraga, auto-tagging, face recognition',
  'Remove Background',
  'Original quality — bez kompresije',
  'Deljenje albuma i foldera',
  'Desktop sync aplikacija',
  'Web, Android & iOS pristup',
  'EU serveri, GDPR zaštita',
  'Bez AI treninga na vašim slikama',
];

// MyDisk Lite is the only paid tier without MyPhoto auto-backup — the
// feature list reflects that and the missing line is replaced with an
// explicit "no auto-backup" note so the pricing card is honest.
export const MYDISK_LITE_FEATURES = [
  'Samo MySpace storage — bez MyPhoto auto-backupa',
  'MySpace cloud storage za fajlove',
  'Deljenje albuma i foldera',
  'Desktop sync aplikacija',
  'Web, Android & iOS pristup',
  'EU serveri, GDPR zaštita',
];

// Storage Tiers. Most tiers bundle the full feature set and just scale
// storage; MyDisk Lite (tier 1) is the exception — it's storage-only, no
// MyPhoto auto-backup, sold yearly-only as an entry "cloud disk" SKU.
export const STORAGE_TIERS: StorageTier[] = [
  {
    tier: 0,
    name: 'Free',
    storageBytes: 1 * BYTES_PER_GB,
    storageDisplay: '1 GB',
    priceMonthly: 0,
    priceYearly: 0,
    periods: [],
    paddleMonthlyId: '',
    paddleYearlyId: '',
    freemiusPlanId: '',
    creemMonthlyProductId: '',
    creemQuarterlyProductId: '',
    creemSemiannualProductId: '',
    creemYearlyProductId: '',
    features: ALL_FEATURES,
    hasPhotoBackup: true,
    memesPerDay: 2,
    memesPerMonth: 50,
  },
  {
    tier: 1,
    name: 'MyDisk Lite',
    storageBytes: 24 * BYTES_PER_GB,
    storageDisplay: '24 GB',
    priceMonthly: 0,
    priceYearly: 4.99,
    periods: ['yearly'],
    paddleMonthlyId: '',
    paddleYearlyId: '',
    freemiusPlanId: '',
    creemMonthlyProductId: '',
    creemQuarterlyProductId: '',
    creemSemiannualProductId: '',
    creemYearlyProductId: '',
    features: MYDISK_LITE_FEATURES,
    hasPhotoBackup: false,
    yearlyOnly: true,
    memesPerDay: 0,
    memesPerMonth: 0,
  },
  {
    tier: 2,
    name: 'Mini',
    storageBytes: 32 * BYTES_PER_GB,
    storageDisplay: '32 GB',
    priceMonthly: 0.69,
    priceSemiannual: 4.99,
    priceYearly: 6.90,
    periods: ['semiannual', 'yearly'],
    paddleMonthlyId: '',
    paddleYearlyId: '',
    freemiusPlanId: '',
    creemMonthlyProductId: '',
    creemQuarterlyProductId: '',
    creemSemiannualProductId: '',
    creemYearlyProductId: '',
    features: ALL_FEATURES,
    hasPhotoBackup: true,
    memesPerDay: 5,
    memesPerMonth: 150,
  },
  {
    tier: 3,
    name: 'Basic',
    storageBytes: 64 * BYTES_PER_GB,
    storageDisplay: '64 GB',
    priceMonthly: 0.99,
    priceSemiannual: 5.94,
    priceYearly: 9.99,
    periods: ['semiannual', 'yearly'],
    paddleMonthlyId: '',
    paddleYearlyId: '',
    freemiusPlanId: '',
    creemMonthlyProductId: '',
    creemQuarterlyProductId: '',
    creemSemiannualProductId: '',
    creemYearlyProductId: '',
    features: ALL_FEATURES,
    hasPhotoBackup: true,
    memesPerDay: 8,
    memesPerMonth: 250,
  },
  {
    tier: 4,
    name: 'Starter',
    storageBytes: 150 * BYTES_PER_GB,
    storageDisplay: '150 GB',
    priceMonthly: 2.49,
    priceQuarterly: 7.47,
    priceSemiannual: 14.94,
    priceYearly: 24.90,
    periods: ['quarterly', 'semiannual', 'yearly'],
    paddleMonthlyId: '',
    paddleYearlyId: '',
    freemiusPlanId: '',
    creemMonthlyProductId: '',
    creemQuarterlyProductId: '',
    creemSemiannualProductId: '',
    creemYearlyProductId: '',
    features: ALL_FEATURES,
    hasPhotoBackup: true,
    isPopular: true,
    memesPerDay: 11,
    memesPerMonth: 350,
  },
  {
    tier: 5,
    name: 'Plus',
    storageBytes: 250 * BYTES_PER_GB,
    storageDisplay: '250 GB',
    priceMonthly: 3.99,
    priceQuarterly: 11.97,
    priceSemiannual: 23.94,
    priceYearly: 39.90,
    periods: ['quarterly', 'semiannual', 'yearly'],
    paddleMonthlyId: '',
    paddleYearlyId: '',
    freemiusPlanId: '',
    creemMonthlyProductId: '',
    creemQuarterlyProductId: '',
    creemSemiannualProductId: '',
    creemYearlyProductId: '',
    features: ALL_FEATURES,
    hasPhotoBackup: true,
    memesPerDay: 14,
    memesPerMonth: 450,
  },
  {
    tier: 6,
    name: 'Pro',
    storageBytes: 500 * BYTES_PER_GB,
    storageDisplay: '500 GB',
    priceMonthly: 7.49,
    priceQuarterly: 22.47,
    priceSemiannual: 44.94,
    priceYearly: 74.90,
    periods: ALL_PERIODS,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    freemiusPlanId: '',
    creemMonthlyProductId: '',
    creemQuarterlyProductId: '',
    creemSemiannualProductId: '',
    creemYearlyProductId: '',
    features: ALL_FEATURES,
    hasPhotoBackup: true,
    memesPerDay: 17,
    memesPerMonth: 550,
  },
  {
    tier: 7,
    name: 'Pro+',
    storageBytes: 750 * BYTES_PER_GB,
    storageDisplay: '750 GB',
    priceMonthly: 10.99,
    priceQuarterly: 32.97,
    priceSemiannual: 65.94,
    priceYearly: 109.90,
    periods: ALL_PERIODS,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    freemiusPlanId: '',
    creemMonthlyProductId: '',
    creemQuarterlyProductId: '',
    creemSemiannualProductId: '',
    creemYearlyProductId: '',
    features: ALL_FEATURES,
    hasPhotoBackup: true,
    memesPerDay: 22,
    memesPerMonth: 700,
  },
  {
    tier: 8,
    name: 'Max',
    storageBytes: 1 * BYTES_PER_TB,
    storageDisplay: '1 TB',
    priceMonthly: 14.49,
    priceQuarterly: 43.47,
    priceSemiannual: 86.94,
    priceYearly: 144.90,
    periods: ALL_PERIODS,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    freemiusPlanId: '',
    creemMonthlyProductId: '',
    creemQuarterlyProductId: '',
    creemSemiannualProductId: '',
    creemYearlyProductId: '',
    features: ALL_FEATURES,
    hasPhotoBackup: true,
    memesPerDay: 28,
    memesPerMonth: 850,
  },
  {
    tier: 9,
    name: 'Ultra',
    storageBytes: 2 * BYTES_PER_TB,
    storageDisplay: '2 TB',
    priceMonthly: 24.99,
    priceQuarterly: 74.97,
    priceSemiannual: 149.94,
    priceYearly: 249.90,
    periods: ALL_PERIODS,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    freemiusPlanId: '',
    creemMonthlyProductId: '',
    creemQuarterlyProductId: '',
    creemSemiannualProductId: '',
    creemYearlyProductId: '',
    features: ALL_FEATURES,
    hasPhotoBackup: true,
    memesPerDay: 40,
    memesPerMonth: 1200,
  },
];

/** Periods a tier is sold in, in BILLING_PERIOD_ORDER. Empty for Free. */
export function getTierPeriods(tier: StorageTier): BillingPeriod[] {
  if (tier.tier === 0) return [];
  if (MICRO_TX_MONTHLY_ENABLED && tier.priceMonthly > 0 && !tier.periods.includes('monthly')) {
    return ['monthly', ...tier.periods];
  }
  return tier.periods;
}

/** The wanted period if the tier sells it, else the shortest longer period it
 *  sells, else its longest period. Lets one page-wide toggle drive every card. */
export function resolveTierPeriod(tier: StorageTier, wanted: BillingPeriod): BillingPeriod {
  const periods = getTierPeriods(tier);
  if (periods.includes(wanted)) return wanted;
  const wantedMonths = BILLING_PERIODS[wanted].months;
  return periods.find((p) => BILLING_PERIODS[p].months > wantedMonths) ?? periods[periods.length - 1] ?? 'yearly';
}

/** Total charged for one billing period. */
export function getTierPrice(tier: StorageTier, period: BillingPeriod): number {
  switch (period) {
    case 'monthly': return tier.priceMonthly;
    case 'quarterly': return tier.priceQuarterly ?? Math.round(tier.priceMonthly * 3 * 100) / 100;
    case 'semiannual': return tier.priceSemiannual ?? Math.round(tier.priceMonthly * 6 * 100) / 100;
    case 'yearly': return tier.priceYearly;
  }
}

/** Per-month equivalent of a period's price. */
export function getTierMonthlyEquivalent(tier: StorageTier, period: BillingPeriod): number {
  return getTierPrice(tier, period) / BILLING_PERIODS[period].months;
}

/** Savings vs. the reference monthly rate, in whole percent (0 if none). */
export function getTierSavingsPercent(tier: StorageTier, period: BillingPeriod): number {
  if (tier.priceMonthly <= 0) return 0;
  return Math.max(0, Math.round((1 - getTierMonthlyEquivalent(tier, period) / tier.priceMonthly) * 100));
}

export function getTierCreemProductId(tier: StorageTier, period: BillingPeriod): string {
  switch (period) {
    case 'monthly': return tier.creemMonthlyProductId || '';
    case 'quarterly': return tier.creemQuarterlyProductId || '';
    case 'semiannual': return tier.creemSemiannualProductId || '';
    case 'yearly': return tier.creemYearlyProductId || '';
  }
}

/** Reverse lookup used by the payment webhook. */
export function findTierByCreemProductId(
  productId: string
): { tier: StorageTier; period: BillingPeriod } | null {
  if (!productId) return null;
  for (const tier of STORAGE_TIERS) {
    for (const period of BILLING_PERIOD_ORDER) {
      if (getTierCreemProductId(tier, period) === productId) return { tier, period };
    }
  }
  return null;
}

export function isBillingPeriod(value: unknown): value is BillingPeriod {
  return typeof value === 'string' && (BILLING_PERIOD_ORDER as string[]).includes(value);
}

// ── Over-quota lifecycle ────────────────────────────────────────────────
// When a subscription ends and the user's files exceed their free allowance
// (1GB + earned referrals), the account goes read-only. After the grace
// period the newest files over the allowance are deleted. 90 days also
// matches Wasabi's 90-day minimum storage charge, so keeping the files that
// long costs nothing extra.
export const OVER_QUOTA_GRACE_DAYS = 90;
/** Days after going over quota on which a warning email is sent. */
export const OVER_QUOTA_NOTICE_DAYS = [0, 30, 60, 83, 89] as const;
/** Deletion never runs unless a warning went out at least this long before. */
export const OVER_QUOTA_MIN_NOTICE_DAYS = 7;

// ── Archive (keep-only) one-time purchase ───────────────────────────────
// Lets an ex-subscriber keep files over the free allowance read-only for N
// months. Price = storage cost x margin, covering the payment fee, and is
// only offered when cheaper than the smallest plan that fits the files.
export const STORAGE_COST_EUR_PER_GB_MONTH = 0.0074; // Wasabi ~$8/TB/month
export const ARCHIVE_MARGIN_MULTIPLIER = 3;
export const ARCHIVE_MONTH_OPTIONS = [1, 3, 6, 12] as const;
export const ARCHIVE_MIN_PRICE_EUR = 4.99;
export const PAYMENT_FEE_PERCENT = 0.039;
export const PAYMENT_FEE_FIXED_EUR = 0.35; // $0.40

/** Round a price up to the next x.49 / x.99. */
function roundUpToPricePoint(eur: number): number {
  const whole = Math.floor(eur);
  if (eur <= whole + 0.49) return whole + 0.49;
  if (eur <= whole + 0.99) return whole + 0.99;
  return whole + 1.49;
}

/** Archive price for keeping `bytes` for `months`: what we must charge so the
 *  net after the payment fee is >= ARCHIVE_MARGIN_MULTIPLIER x storage cost. */
export function getArchivePrice(bytes: number, months: number): number {
  const cost = (bytes / BYTES_PER_GB) * STORAGE_COST_EUR_PER_GB_MONTH * months;
  const gross = (cost * ARCHIVE_MARGIN_MULTIPLIER + PAYMENT_FEE_FIXED_EUR) / (1 - PAYMENT_FEE_PERCENT);
  return Math.max(ARCHIVE_MIN_PRICE_EUR, roundUpToPricePoint(gross));
}

export type ArchiveOffer =
  | { kind: 'archive'; months: number; price: number }
  | { kind: 'plan'; months: number; price: number; tier: StorageTier; period: BillingPeriod };

/** For each duration: the archive, or a real plan if that is no dearer. */
export function getArchiveOffers(bytes: number): ArchiveOffer[] {
  const plan = STORAGE_TIERS.find((t) => t.tier > 0 && t.storageBytes >= bytes) ?? null;
  return ARCHIVE_MONTH_OPTIONS.map((months) => {
    const price = getArchivePrice(bytes, months);
    if (plan) {
      const period = getTierPeriods(plan).find((p) => BILLING_PERIODS[p].months === months);
      if (period) {
        const planPrice = getTierPrice(plan, period);
        if (planPrice <= price) return { kind: 'plan', months, price: planPrice, tier: plan, period };
      }
    }
    return { kind: 'archive', months, price };
  });
}

// Upload Constants
export const MAX_UPLOAD_SIZE = 10 * BYTES_PER_GB; // 10GB max file size
export const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks for large uploads
export const PRESIGNED_URL_EXPIRY = 15 * 60; // 15 minutes in seconds

// Thumbnail sizes
export const THUMBNAIL_SIZES = {
  small: { width: 200, height: 200 },
  medium: { width: 400, height: 400 },
  large: { width: 1200, height: 1200 },
} as const;

// Supported file types
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
];

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/webm',
  'video/3gpp',
  'video/x-matroska',
];

export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

export const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
];

// Wasabi S3 Configuration
export const WASABI_REGION = 'eu-central-2';
export const WASABI_ENDPOINT = `https://s3.${WASABI_REGION}.wasabisys.com`;

// API Rate Limits
export const RATE_LIMITS = {
  upload: 100, // 100 uploads per minute
  download: 200, // 200 downloads per minute
  search: 60, // 60 searches per minute
  api: 1000, // 1000 API calls per minute
} as const;

// AI Processing
export const AI_PROCESSING_DELAY = 5000; // 5 seconds delay before AI processing
export const MAX_AI_RETRIES = 3;
export const AI_LABELS_LIMIT = 20; // Max labels per image

// Trash
export const TRASH_RETENTION_DAYS = 30;

// Cache TTL (in seconds)
export const CACHE_TTL = {
  user: 300, // 5 minutes
  files: 60, // 1 minute
  albums: 120, // 2 minutes
  search: 180, // 3 minutes
} as const;

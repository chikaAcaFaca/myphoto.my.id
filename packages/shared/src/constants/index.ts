import type { StorageTier } from '../types';

// Storage Constants
export const BYTES_PER_GB = 1024 * 1024 * 1024;
export const BYTES_PER_TB = BYTES_PER_GB * 1024;

// Free tier: 10GB
export const FREE_STORAGE_LIMIT = 10 * BYTES_PER_GB;

// Billing Periods Configuration
// monthly: base price, quarterly: 2.5% discount, semiAnnual: 5% discount, yearly: 2 months free (~16.67% discount)
export const BILLING_PERIODS = {
  monthly:    { months: 1,  multiplier: 1,     discount: 0,     label: 'Mesečno',      labelShort: '1 mes' },
  quarterly:  { months: 3,  multiplier: 2.925, discount: 2.5,   label: 'Kvartalno',    labelShort: '3 mes' },
  semiAnnual: { months: 6,  multiplier: 5.70,  discount: 5,     label: 'Polugodišnje', labelShort: '6 mes' },
  yearly:     { months: 12, multiplier: 10,    discount: 16.67, label: 'Godišnje',     labelShort: '12 mes' },
} as const;

// Storage Tiers Configuration
// Pricing from TWO TYPE AI AND NO AI spreadsheet
// NO AI = Standard pricing, AI = Premium pricing with AI features
// Quarterly = monthly × 3 × 0.975, SemiAnnual = monthly × 6 × 0.95, Yearly = monthly × 10
export const STORAGE_TIERS: StorageTier[] = [
  {
    tier: 0,
    name: 'Free',
    storageBytes: 10 * BYTES_PER_GB,
    storageDisplay: '10 GB',
    priceMonthly: 0,
    priceQuarterly: 0,
    priceSemiAnnual: 0,
    priceYearly: 0,
    paddleProductId: '',
    paddleQuarterlyId: '',
    paddleSemiAnnualId: '',
    paddleYearlyId: '',
    priceMonthlyAI: 0,
    priceQuarterlyAI: 0,
    priceSemiAnnualAI: 0,
    priceYearlyAI: 0,
    paddleProductIdAI: '',
    paddleQuarterlyIdAI: '',
    paddleSemiAnnualIdAI: '',
    paddleYearlyIdAI: '',
    features: [
      'Web & mobile access',
      'Automatic backups',
      'Basic sharing',
      'Original quality storage',
    ],
    aiFeatures: [
      'AI demo (50 photos/month)',
    ],
  },
  {
    tier: 1,
    name: 'Starter',
    storageBytes: 150 * BYTES_PER_GB,
    storageDisplay: '150 GB',
    priceMonthly: 2.49,
    priceQuarterly: 7.28,
    priceSemiAnnual: 14.19,
    priceYearly: 24.90,
    paddleProductId: 'pri_starter_monthly',
    paddleQuarterlyId: 'pri_starter_quarterly',
    paddleSemiAnnualId: 'pri_starter_semiannual',
    paddleYearlyId: 'pri_starter_yearly',
    priceMonthlyAI: 2.99,
    priceQuarterlyAI: 8.75,
    priceSemiAnnualAI: 17.04,
    priceYearlyAI: 29.90,
    paddleProductIdAI: 'pri_starter_ai_monthly',
    paddleQuarterlyIdAI: 'pri_starter_ai_quarterly',
    paddleSemiAnnualIdAI: 'pri_starter_ai_semiannual',
    paddleYearlyIdAI: 'pri_starter_ai_yearly',
    features: [
      'Web & mobile access',
      'Automatic backups',
      'Album sharing',
      'Original quality storage',
      'Priority upload',
    ],
    aiFeatures: [
      'Smart search',
      'Auto-tagging',
      'Face recognition',
    ],
  },
  {
    tier: 2,
    name: 'Plus',
    storageBytes: 250 * BYTES_PER_GB,
    storageDisplay: '250 GB',
    priceMonthly: 3.49,
    priceQuarterly: 10.21,
    priceSemiAnnual: 19.90,
    priceYearly: 34.90,
    paddleProductId: 'pri_plus_monthly',
    paddleQuarterlyId: 'pri_plus_quarterly',
    paddleSemiAnnualId: 'pri_plus_semiannual',
    paddleYearlyId: 'pri_plus_yearly',
    priceMonthlyAI: 4.49,
    priceQuarterlyAI: 13.14,
    priceSemiAnnualAI: 25.60,
    priceYearlyAI: 44.90,
    paddleProductIdAI: 'pri_plus_ai_monthly',
    paddleQuarterlyIdAI: 'pri_plus_ai_quarterly',
    paddleSemiAnnualIdAI: 'pri_plus_ai_semiannual',
    paddleYearlyIdAI: 'pri_plus_ai_yearly',
    features: [
      'Web & mobile access',
      'Automatic backups',
      'Album sharing',
      'Original quality storage',
      'Priority upload',
    ],
    aiFeatures: [
      'Smart search',
      'Auto-tagging',
      'Face recognition',
    ],
    isPopular: true,
  },
  {
    tier: 3,
    name: 'Standard',
    storageBytes: 500 * BYTES_PER_GB,
    storageDisplay: '500 GB',
    priceMonthly: 5.99,
    priceQuarterly: 17.52,
    priceSemiAnnual: 34.14,
    priceYearly: 59.90,
    paddleProductId: 'pri_standard_monthly',
    paddleQuarterlyId: 'pri_standard_quarterly',
    paddleSemiAnnualId: 'pri_standard_semiannual',
    paddleYearlyId: 'pri_standard_yearly',
    priceMonthlyAI: 7.99,
    priceQuarterlyAI: 23.37,
    priceSemiAnnualAI: 45.54,
    priceYearlyAI: 79.90,
    paddleProductIdAI: 'pri_standard_ai_monthly',
    paddleQuarterlyIdAI: 'pri_standard_ai_quarterly',
    paddleSemiAnnualIdAI: 'pri_standard_ai_semiannual',
    paddleYearlyIdAI: 'pri_standard_ai_yearly',
    features: [
      'Web & mobile access',
      'Automatic backups',
      'Album sharing',
      'Original quality storage',
      'Priority upload',
      'Family sharing (up to 5)',
    ],
    aiFeatures: [
      'Smart search',
      'Auto-tagging',
      'Face recognition',
      'AI photo assistant',
    ],
  },
  {
    tier: 4,
    name: 'Pro',
    storageBytes: 750 * BYTES_PER_GB,
    storageDisplay: '750 GB',
    priceMonthly: 8.99,
    priceQuarterly: 26.30,
    priceSemiAnnual: 51.24,
    priceYearly: 89.90,
    paddleProductId: 'pri_pro_monthly',
    paddleQuarterlyId: 'pri_pro_quarterly',
    paddleSemiAnnualId: 'pri_pro_semiannual',
    paddleYearlyId: 'pri_pro_yearly',
    priceMonthlyAI: 11.99,
    priceQuarterlyAI: 35.07,
    priceSemiAnnualAI: 68.34,
    priceYearlyAI: 119.90,
    paddleProductIdAI: 'pri_pro_ai_monthly',
    paddleQuarterlyIdAI: 'pri_pro_ai_quarterly',
    paddleSemiAnnualIdAI: 'pri_pro_ai_semiannual',
    paddleYearlyIdAI: 'pri_pro_ai_yearly',
    features: [
      'Web & mobile access',
      'Automatic backups',
      'Album sharing',
      'Original quality storage',
      'Priority upload',
      'Family sharing (up to 5)',
      'Premium support',
    ],
    aiFeatures: [
      'Smart search',
      'Auto-tagging',
      'Face recognition',
      'AI photo assistant',
      'Background removal',
    ],
  },
  {
    tier: 5,
    name: 'Pro+',
    storageBytes: 1.25 * BYTES_PER_TB,
    storageDisplay: '1.25 TB',
    priceMonthly: 13.49,
    priceQuarterly: 39.46,
    priceSemiAnnual: 76.89,
    priceYearly: 134.90,
    paddleProductId: 'pri_proplus_monthly',
    paddleQuarterlyId: 'pri_proplus_quarterly',
    paddleSemiAnnualId: 'pri_proplus_semiannual',
    paddleYearlyId: 'pri_proplus_yearly',
    priceMonthlyAI: 17.99,
    priceQuarterlyAI: 52.62,
    priceSemiAnnualAI: 102.54,
    priceYearlyAI: 179.90,
    paddleProductIdAI: 'pri_proplus_ai_monthly',
    paddleQuarterlyIdAI: 'pri_proplus_ai_quarterly',
    paddleSemiAnnualIdAI: 'pri_proplus_ai_semiannual',
    paddleYearlyIdAI: 'pri_proplus_ai_yearly',
    features: [
      'Web & mobile access',
      'Automatic backups',
      'Album sharing',
      'Original quality storage',
      'Priority upload',
      'Family sharing (up to 5)',
      'Premium support',
    ],
    aiFeatures: [
      'Unlimited AI features',
      'Smart search',
      'Auto-tagging',
      'Face recognition',
      'AI photo assistant',
      'Background removal',
    ],
  },
  {
    tier: 6,
    name: 'Premium',
    storageBytes: 2.5 * BYTES_PER_TB,
    storageDisplay: '2.5 TB',
    priceMonthly: 24.99,
    priceQuarterly: 73.10,
    priceSemiAnnual: 142.44,
    priceYearly: 249.90,
    paddleProductId: 'pri_premium_monthly',
    paddleQuarterlyId: 'pri_premium_quarterly',
    paddleSemiAnnualId: 'pri_premium_semiannual',
    paddleYearlyId: 'pri_premium_yearly',
    priceMonthlyAI: 31.99,
    priceQuarterlyAI: 93.57,
    priceSemiAnnualAI: 182.34,
    priceYearlyAI: 319.90,
    paddleProductIdAI: 'pri_premium_ai_monthly',
    paddleQuarterlyIdAI: 'pri_premium_ai_quarterly',
    paddleSemiAnnualIdAI: 'pri_premium_ai_semiannual',
    paddleYearlyIdAI: 'pri_premium_ai_yearly',
    features: [
      'Web & mobile access',
      'Automatic backups',
      'Album sharing',
      'Original quality storage',
      'Priority upload',
      'Family sharing (up to 5)',
      'Premium support',
      'API access',
    ],
    aiFeatures: [
      'Unlimited AI features',
      'Smart search',
      'Auto-tagging',
      'Face recognition',
      'AI photo assistant',
      'Background removal',
      'Photo enhancement',
    ],
  },
  {
    tier: 7,
    name: 'Business',
    storageBytes: 5 * BYTES_PER_TB,
    storageDisplay: '5 TB',
    priceMonthly: 45.99,
    priceQuarterly: 134.52,
    priceSemiAnnual: 262.14,
    priceYearly: 459.90,
    paddleProductId: 'pri_business_monthly',
    paddleQuarterlyId: 'pri_business_quarterly',
    paddleSemiAnnualId: 'pri_business_semiannual',
    paddleYearlyId: 'pri_business_yearly',
    priceMonthlyAI: 54.99,
    priceQuarterlyAI: 160.85,
    priceSemiAnnualAI: 313.44,
    priceYearlyAI: 549.90,
    paddleProductIdAI: 'pri_business_ai_monthly',
    paddleQuarterlyIdAI: 'pri_business_ai_quarterly',
    paddleSemiAnnualIdAI: 'pri_business_ai_semiannual',
    paddleYearlyIdAI: 'pri_business_ai_yearly',
    features: [
      'Everything in Premium',
      'Team management',
      'Advanced sharing controls',
      'Audit logs',
      'SSO integration',
    ],
    aiFeatures: [
      'Unlimited AI features',
      'Priority AI processing',
      'Custom AI models',
      'Bulk operations',
    ],
  },
  {
    tier: 8,
    name: 'Enterprise',
    storageBytes: 10 * BYTES_PER_TB,
    storageDisplay: '10 TB',
    priceMonthly: 84.99,
    priceQuarterly: 248.60,
    priceSemiAnnual: 484.44,
    priceYearly: 849.90,
    paddleProductId: 'pri_enterprise_monthly',
    paddleQuarterlyId: 'pri_enterprise_quarterly',
    paddleSemiAnnualId: 'pri_enterprise_semiannual',
    paddleYearlyId: 'pri_enterprise_yearly',
    priceMonthlyAI: 94.99,
    priceQuarterlyAI: 277.85,
    priceSemiAnnualAI: 541.44,
    priceYearlyAI: 949.90,
    paddleProductIdAI: 'pri_enterprise_ai_monthly',
    paddleQuarterlyIdAI: 'pri_enterprise_ai_quarterly',
    paddleSemiAnnualIdAI: 'pri_enterprise_ai_semiannual',
    paddleYearlyIdAI: 'pri_enterprise_ai_yearly',
    features: [
      'Everything in Business',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'On-premise option',
    ],
    aiFeatures: [
      'Unlimited AI features',
      'Priority AI processing',
      'Custom AI models',
      'Bulk operations',
      'Dedicated AI resources',
    ],
  },
];

// Family Plan
export const FAMILY_MEMBER_PRICE = 2.0; // $2/month per additional member
export const MAX_FAMILY_MEMBERS = 5;

// Business Plan
export const BUSINESS_USER_PRICE = 3.0; // $3/month per user
export const MIN_BUSINESS_USERS = 3;
export const MAX_BUSINESS_USERS = 25;

// Upload Constants
export const MAX_UPLOAD_SIZE = 10 * BYTES_PER_GB; // 10GB max file size
export const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks for large uploads
export const PRESIGNED_URL_EXPIRY = 15 * 60; // 15 minutes in seconds

// Thumbnail sizes
export const THUMBNAIL_SIZES = {
  small: { width: 200, height: 200 },
  medium: { width: 400, height: 400 },
  large: { width: 800, height: 800 },
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

import type { StorageTier } from '../types';

// Currency
export const CURRENCY_SYMBOL = '€';
export const CURRENCY_CODE = 'EUR';

// Storage Constants
export const BYTES_PER_MB = 1024 * 1024;
export const BYTES_PER_GB = 1024 * 1024 * 1024;
export const BYTES_PER_TB = BYTES_PER_GB * 1024;

// Free tier: 1GB on registration
export const FREE_STORAGE_LIMIT = 1 * BYTES_PER_GB;

// Bonus: +1GB for installing Android/iOS app + enabling auto-backup
export const APP_INSTALL_BONUS = 1 * BYTES_PER_GB;

// Bonus: +512MB for installing Desktop app + enabling sync
export const DESKTOP_INSTALL_BONUS = 512 * BYTES_PER_MB;

// Referral constants
export const REFERRAL_BONUS = 512 * BYTES_PER_MB;        // +512MB per referral
export const MAX_REFERRAL_BONUS = 7 * BYTES_PER_GB;       // max 7GB bonus (14 referrals × 512MB)
export const MAX_REFERRALS = 14;                           // max 14 friends
export const REFERRAL_QUALIFICATION_BYTES = 100 * BYTES_PER_MB; // referee must upload 100MB to qualify
export const MAX_FAMILY_MEMBERS_REFERRAL = 6;

// Max free storage: 1GB (reg) + 1GB (app) + 512MB (desktop) + 7GB (referrals) = ~10GB
// But realistically without all referrals: 1GB + 1GB + 512MB + 512MB = 3GB (enough for MyDisk free)
export const MAX_FREE_STORAGE = 10 * BYTES_PER_GB;

// MyDisk Free tier — 3.99 EUR/year for instant 10GB
export const MYDISK_FREE_YEARLY_PRICE = 3.99;
export const MYDISK_FREE_STORAGE = 10 * BYTES_PER_GB;

// Legacy — keep for backward compatibility during migration
export const BACKUP_BONUS = APP_INSTALL_BONUS;

// Billing Periods — simplified to monthly and yearly only
export const BILLING_PERIODS = {
  monthly: { months: 1,  multiplier: 1,  discount: 0,     label: 'Mesečno',  labelShort: '1 mes' },
  yearly:  { months: 12, multiplier: 10, discount: 16.67, label: 'Godišnje', labelShort: '12 mes' },
} as const;

// Storage Tiers Configuration
// Prices converted: old EUR values treated as USD, divided by 1.12, then rounded per user approval
export const STORAGE_TIERS: StorageTier[] = [
  {
    tier: 0,
    name: 'Free',
    storageBytes: 1 * BYTES_PER_GB,
    storageDisplay: '1 GB',
    priceMonthly: 0,
    priceYearly: 0,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    priceMonthlyAI: 0,
    priceYearlyAI: 0,
    paddleMonthlyIdAI: '',
    paddleYearlyIdAI: '',
    features: [
      'Web & mobile pristup',
      'Remove Background (bez limita)',
      'Deljenje slika i fajlova',
      'Original quality storage',
    ],
    aiFeatures: [
      'AI demo (50 slika/mesec)',
    ],
    myPhotoEnabled: true,
    myDiskEnabled: false,
    canToggle: false,
  },
  {
    tier: 0.3,
    name: 'MyMiniDisk',
    storageBytes: 32 * BYTES_PER_GB,
    storageDisplay: '32 GB',
    priceMonthly: 0.69,
    priceYearly: 6.99,
    paddleMonthlyId: 'pri_myminidisk_monthly',
    paddleYearlyId: 'pri_myminidisk_yearly',
    priceMonthlyAI: 0,
    priceYearlyAI: 0,
    paddleMonthlyIdAI: '',
    paddleYearlyIdAI: '',
    features: [
      'MyDisk — cloud folder storage',
      '32 GB cloud prostora',
      'Upload svih tipova fajlova',
      'Folder organizacija',
      'Deljenje foldera',
      'Remove Background (bez limita)',
      'Može uključiti i MyPhoto backup',
    ],
    aiFeatures: [],
    myPhotoEnabled: false,
    myDiskEnabled: true,
    canToggle: true,
  },
  {
    tier: 0.4,
    name: 'MiniPhoto',
    storageBytes: 64 * BYTES_PER_GB,
    storageDisplay: '64 GB',
    priceMonthly: 0.99,
    priceYearly: 9.99,
    paddleMonthlyId: 'pri_miniphoto_monthly',
    paddleYearlyId: 'pri_miniphoto_yearly',
    priceMonthlyAI: 0,
    priceYearlyAI: 0,
    paddleMonthlyIdAI: '',
    paddleYearlyIdAI: '',
    features: [
      'MyPhoto — auto-backup slika i videa',
      '64 GB cloud prostora',
      'Desktop sync aplikacija',
      'Deljenje albuma i foldera',
      'Remove Background (bez limita)',
      'Može uključiti i MyDisk',
    ],
    aiFeatures: [],
    myPhotoEnabled: true,
    myDiskEnabled: false,
    canToggle: true,
  },
  {
    tier: 0.5,
    name: 'MyDisk',
    storageBytes: 50 * BYTES_PER_GB,
    storageDisplay: '50 GB',
    priceMonthly: 0.88,
    priceYearly: 8.84,
    paddleMonthlyId: 'pri_mydisk_monthly',
    paddleYearlyId: 'pri_mydisk_yearly',
    priceMonthlyAI: 0,
    priceYearlyAI: 0,
    paddleMonthlyIdAI: '',
    paddleYearlyIdAI: '',
    features: [
      'MyDisk — cloud folder storage',
      '50 GB cloud prostora',
      'Desktop sync aplikacija',
      'Folder organizacija',
      'Upload svih tipova fajlova',
      'Remove Background (bez limita)',
      'Može uključiti i MyPhoto backup',
    ],
    aiFeatures: [],
    myPhotoEnabled: false,
    myDiskEnabled: true,
    canToggle: true,
  },
  {
    tier: 1,
    name: 'Starter',
    storageBytes: 150 * BYTES_PER_GB,
    storageDisplay: '150 GB',
    priceMonthly: 2.22,
    priceYearly: 22.23,
    paddleMonthlyId: 'pri_starter_monthly',
    paddleYearlyId: 'pri_starter_yearly',
    priceMonthlyAI: 2.69,
    priceYearlyAI: 26.90,
    paddleMonthlyIdAI: 'pri_starter_ai_monthly',
    paddleYearlyIdAI: 'pri_starter_ai_yearly',
    features: [
      'MyPhoto + MyDisk uključeni',
      'Web & mobile pristup',
      'Auto-backup slika',
      'Deljenje albuma i foldera',
      'Original quality storage',
      'Priority upload',
      'Desktop sync',
      'Remove Background (bez limita)',
    ],
    aiFeatures: [
      'Smart search',
      'Auto-tagging',
      'Face recognition',
    ],
    myPhotoEnabled: true,
    myDiskEnabled: true,
    canToggle: true,
  },
  {
    tier: 2,
    name: 'Plus',
    storageBytes: 250 * BYTES_PER_GB,
    storageDisplay: '250 GB',
    priceMonthly: 3.12,
    priceYearly: 31.99,
    paddleMonthlyId: 'pri_plus_monthly',
    paddleYearlyId: 'pri_plus_yearly',
    priceMonthlyAI: 3.99,
    priceYearlyAI: 39.99,
    paddleMonthlyIdAI: 'pri_plus_ai_monthly',
    paddleYearlyIdAI: 'pri_plus_ai_yearly',
    features: [
      'MyPhoto + MyDisk uključeni',
      'Web & mobile pristup',
      'Auto-backup slika',
      'Deljenje albuma i foldera',
      'Original quality storage',
      'Priority upload',
      'Desktop sync',
      'Remove Background (bez limita)',
    ],
    aiFeatures: [
      'Smart search',
      'Auto-tagging',
      'Face recognition',
    ],
    isPopular: true,
    myPhotoEnabled: true,
    myDiskEnabled: true,
    canToggle: true,
  },
  {
    tier: 3,
    name: 'Standard',
    storageBytes: 500 * BYTES_PER_GB,
    storageDisplay: '500 GB',
    priceMonthly: 5.35,
    priceYearly: 53.48,
    paddleMonthlyId: 'pri_standard_monthly',
    paddleYearlyId: 'pri_standard_yearly',
    priceMonthlyAI: 7.13,
    priceYearlyAI: 71.34,
    paddleMonthlyIdAI: 'pri_standard_ai_monthly',
    paddleYearlyIdAI: 'pri_standard_ai_yearly',
    features: [
      'MyPhoto + MyDisk uključeni',
      'Web & mobile pristup',
      'Auto-backup slika',
      'Deljenje albuma i foldera',
      'Original quality storage',
      'Priority upload',
      'Family sharing (do 5 članova)',
      'Desktop sync',
      'Remove Background (bez limita)',
    ],
    aiFeatures: [
      'Smart search',
      'Auto-tagging',
      'Face recognition',
      'AI photo assistant',
    ],
    myPhotoEnabled: true,
    myDiskEnabled: true,
    canToggle: true,
  },
  {
    tier: 4,
    name: 'Pro',
    storageBytes: 750 * BYTES_PER_GB,
    storageDisplay: '750 GB',
    priceMonthly: 8.03,
    priceYearly: 80.27,
    paddleMonthlyId: 'pri_pro_monthly',
    paddleYearlyId: 'pri_pro_yearly',
    priceMonthlyAI: 10.71,
    priceYearlyAI: 107.05,
    paddleMonthlyIdAI: 'pri_pro_ai_monthly',
    paddleYearlyIdAI: 'pri_pro_ai_yearly',
    features: [
      'MyPhoto + MyDisk uključeni',
      'Web & mobile pristup',
      'Auto-backup slika',
      'Deljenje albuma i foldera',
      'Original quality storage',
      'Priority upload',
      'Family sharing (do 5 članova)',
      'Premium podrška',
      'Desktop sync',
      'Remove Background (bez limita)',
    ],
    aiFeatures: [
      'Smart search',
      'Auto-tagging',
      'Face recognition',
      'AI photo assistant',
      'Background removal',
    ],
    myPhotoEnabled: true,
    myDiskEnabled: true,
    canToggle: true,
  },
  {
    tier: 5,
    name: 'Pro+',
    storageBytes: 1.25 * BYTES_PER_TB,
    storageDisplay: '1.25 TB',
    priceMonthly: 11.99,
    priceYearly: 119.90,
    paddleMonthlyId: 'pri_proplus_monthly',
    paddleYearlyId: 'pri_proplus_yearly',
    priceMonthlyAI: 15.99,
    priceYearlyAI: 159.99,
    paddleMonthlyIdAI: 'pri_proplus_ai_monthly',
    paddleYearlyIdAI: 'pri_proplus_ai_yearly',
    features: [
      'MyPhoto + MyDisk uključeni',
      'Web & mobile pristup',
      'Auto-backup slika',
      'Deljenje albuma i foldera',
      'Original quality storage',
      'Priority upload',
      'Family sharing (do 5 članova)',
      'Premium podrška',
      'Desktop sync',
      'Remove Background (bez limita)',
    ],
    aiFeatures: [
      'Neograničene AI funkcije',
      'Smart search',
      'Auto-tagging',
      'Face recognition',
      'AI photo assistant',
      'Background removal',
    ],
    myPhotoEnabled: true,
    myDiskEnabled: true,
    canToggle: true,
  },
  {
    tier: 6,
    name: 'Premium',
    storageBytes: 2.5 * BYTES_PER_TB,
    storageDisplay: '2.5 TB',
    priceMonthly: 22.29,
    priceYearly: 222.99,
    paddleMonthlyId: 'pri_premium_monthly',
    paddleYearlyId: 'pri_premium_yearly',
    priceMonthlyAI: 28.56,
    priceYearlyAI: 285.63,
    paddleMonthlyIdAI: 'pri_premium_ai_monthly',
    paddleYearlyIdAI: 'pri_premium_ai_yearly',
    features: [
      'MyPhoto + MyDisk uključeni',
      'Web & mobile pristup',
      'Auto-backup slika',
      'Deljenje albuma i foldera',
      'Original quality storage',
      'Priority upload',
      'Family sharing (do 5 članova)',
      'Premium podrška',
      'Desktop sync',
      'API pristup',
      'Remove Background (bez limita)',
    ],
    aiFeatures: [
      'Neograničene AI funkcije',
      'Smart search',
      'Auto-tagging',
      'Face recognition',
      'AI photo assistant',
      'Background removal',
      'Photo enhancement',
    ],
    myPhotoEnabled: true,
    myDiskEnabled: true,
    canToggle: true,
  },
  {
    tier: 7,
    name: 'Business',
    storageBytes: 5 * BYTES_PER_TB,
    storageDisplay: '5 TB',
    priceMonthly: 44.99,
    priceYearly: 449.99,
    paddleMonthlyId: 'pri_business_monthly',
    paddleYearlyId: 'pri_business_yearly',
    priceMonthlyAI: 53.99,
    priceYearlyAI: 539.99,
    paddleMonthlyIdAI: 'pri_business_ai_monthly',
    paddleYearlyIdAI: 'pri_business_ai_yearly',
    features: [
      'MyPhoto + MyDisk uključeni',
      'Sve iz Premium-a',
      'Tim menadžment',
      'Napredne kontrole deljenja',
      'Audit logovi',
      'SSO integracija',
      'Desktop sync',
      'Remove Background (bez limita)',
    ],
    aiFeatures: [
      'Neograničene AI funkcije',
      'Prioritetna AI obrada',
      'Custom AI modeli',
      'Bulk operacije',
    ],
    myPhotoEnabled: true,
    myDiskEnabled: true,
    canToggle: true,
  },
  {
    tier: 8,
    name: 'Enterprise',
    storageBytes: 10 * BYTES_PER_TB,
    storageDisplay: '10 TB',
    priceMonthly: 80.99,
    priceYearly: 809.99,
    paddleMonthlyId: 'pri_enterprise_monthly',
    paddleYearlyId: 'pri_enterprise_yearly',
    priceMonthlyAI: 89.99,
    priceYearlyAI: 899.99,
    paddleMonthlyIdAI: 'pri_enterprise_ai_monthly',
    paddleYearlyIdAI: 'pri_enterprise_ai_yearly',
    features: [
      'MyPhoto + MyDisk uključeni',
      'Sve iz Business-a',
      'Dedicated podrška',
      'Custom integracije',
      'SLA garancija',
      'On-premise opcija',
      'Desktop sync',
      'Remove Background (bez limita)',
    ],
    aiFeatures: [
      'Neograničene AI funkcije',
      'Prioritetna AI obrada',
      'Custom AI modeli',
      'Bulk operacije',
      'Dedicirani AI resursi',
    ],
    myPhotoEnabled: true,
    myDiskEnabled: true,
    canToggle: true,
  },
];

// Family Plan
export const FAMILY_MEMBER_PRICE = 2.0; // €2/month per additional member
export const MAX_FAMILY_MEMBERS = 5;

// Business Plan
export const BUSINESS_USER_PRICE = 3.0; // €3/month per user
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

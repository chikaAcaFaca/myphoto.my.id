import type { StorageTier } from '../types';

// Storage Constants
export const BYTES_PER_GB = 1024 * 1024 * 1024;
export const BYTES_PER_TB = BYTES_PER_GB * 1024;

// Free tier: 10GB
export const FREE_STORAGE_LIMIT = 10 * BYTES_PER_GB;

// Storage Tiers Configuration
// Pricing from TWO TYPE AI AND NO AI spreadsheet
// NO AI = Standard pricing, AI = Premium pricing with AI features
export const STORAGE_TIERS: StorageTier[] = [
  {
    tier: 0,
    name: 'Free',
    storageBytes: 10 * BYTES_PER_GB,
    storageDisplay: '10 GB',
    priceMonthly: 0,
    priceYearly: 0,
    paddleProductId: '',
    priceMonthlyAI: 0,
    priceYearlyAI: 0,
    paddleProductIdAI: '',
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
    priceYearly: 26.89,
    paddleProductId: 'pri_starter_monthly',
    priceMonthlyAI: 2.99,
    priceYearlyAI: 32.29,
    paddleProductIdAI: 'pri_starter_ai_monthly',
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
    priceYearly: 37.69,
    paddleProductId: 'pri_plus_monthly',
    priceMonthlyAI: 4.49,
    priceYearlyAI: 48.49,
    paddleProductIdAI: 'pri_plus_ai_monthly',
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
    priceYearly: 64.69,
    paddleProductId: 'pri_standard_monthly',
    priceMonthlyAI: 7.99,
    priceYearlyAI: 86.29,
    paddleProductIdAI: 'pri_standard_ai_monthly',
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
    priceYearly: 97.09,
    paddleProductId: 'pri_pro_monthly',
    priceMonthlyAI: 11.99,
    priceYearlyAI: 129.49,
    paddleProductIdAI: 'pri_pro_ai_monthly',
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
    priceMonthly: 12.99,
    priceYearly: 140.29,
    paddleProductId: 'pri_proplus_monthly',
    priceMonthlyAI: 17.99,
    priceYearlyAI: 194.29,
    paddleProductIdAI: 'pri_proplus_ai_monthly',
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
    priceYearly: 269.89,
    paddleProductId: 'pri_premium_monthly',
    priceMonthlyAI: 31.99,
    priceYearlyAI: 345.49,
    paddleProductIdAI: 'pri_premium_ai_monthly',
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
    priceYearly: 496.69,
    paddleProductId: 'pri_business_monthly',
    priceMonthlyAI: 54.99,
    priceYearlyAI: 593.89,
    paddleProductIdAI: 'pri_business_ai_monthly',
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
    priceYearly: 917.89,
    paddleProductId: 'pri_enterprise_monthly',
    priceMonthlyAI: 94.99,
    priceYearlyAI: 1025.89,
    paddleProductIdAI: 'pri_enterprise_ai_monthly',
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
export const WASABI_REGION = 'eu-central-1';
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

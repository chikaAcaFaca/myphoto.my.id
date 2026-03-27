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
// But realistically without all referrals: 1GB + 1GB + 512MB + 512MB = 3GB (enough for MySpace free)
export const MAX_FREE_STORAGE = 10 * BYTES_PER_GB;

// Legacy — keep for backward compatibility during migration
export const BACKUP_BONUS = APP_INSTALL_BONUS;

// Billing Periods — monthly and yearly only
export const BILLING_PERIODS = {
  monthly: { months: 1,  multiplier: 1,  discount: 0,     label: 'Mesečno',  labelShort: '1 mes' },
  yearly:  { months: 12, multiplier: 10, discount: 16.67, label: 'Godišnje', labelShort: '12 mes' },
} as const;

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

// Storage Tiers — all tiers include all features, only storage differs
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
    features: ALL_FEATURES,
  },
  {
    tier: 1,
    name: 'Mini',
    storageBytes: 32 * BYTES_PER_GB,
    storageDisplay: '32 GB',
    priceMonthly: 0.69,
    priceYearly: 6.90,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    features: ALL_FEATURES,
  },
  {
    tier: 2,
    name: 'Basic',
    storageBytes: 64 * BYTES_PER_GB,
    storageDisplay: '64 GB',
    priceMonthly: 0.99,
    priceYearly: 9.90,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    features: ALL_FEATURES,
  },
  {
    tier: 3,
    name: 'Starter',
    storageBytes: 150 * BYTES_PER_GB,
    storageDisplay: '150 GB',
    priceMonthly: 2.49,
    priceYearly: 24.90,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    features: ALL_FEATURES,
    isPopular: true,
  },
  {
    tier: 4,
    name: 'Plus',
    storageBytes: 250 * BYTES_PER_GB,
    storageDisplay: '250 GB',
    priceMonthly: 3.99,
    priceYearly: 39.90,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    features: ALL_FEATURES,
  },
  {
    tier: 5,
    name: 'Pro',
    storageBytes: 500 * BYTES_PER_GB,
    storageDisplay: '500 GB',
    priceMonthly: 7.49,
    priceYearly: 74.90,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    features: ALL_FEATURES,
  },
  {
    tier: 6,
    name: 'Pro+',
    storageBytes: 750 * BYTES_PER_GB,
    storageDisplay: '750 GB',
    priceMonthly: 10.99,
    priceYearly: 109.90,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    features: ALL_FEATURES,
  },
  {
    tier: 7,
    name: 'Max',
    storageBytes: 1 * BYTES_PER_TB,
    storageDisplay: '1 TB',
    priceMonthly: 14.49,
    priceYearly: 144.90,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    features: ALL_FEATURES,
  },
  {
    tier: 8,
    name: 'Ultra',
    storageBytes: 2 * BYTES_PER_TB,
    storageDisplay: '2 TB',
    priceMonthly: 24.99,
    priceYearly: 249.90,
    paddleMonthlyId: '',
    paddleYearlyId: '',
    features: ALL_FEATURES,
  },
];

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

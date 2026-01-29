import type { StorageTier } from '../types';

// Storage Constants
export const BYTES_PER_GB = 1024 * 1024 * 1024;
export const BYTES_PER_TB = BYTES_PER_GB * 1024;

// Free tier: 10GB
export const FREE_STORAGE_LIMIT = 10 * BYTES_PER_GB;

// Storage Tiers Configuration
export const STORAGE_TIERS: StorageTier[] = [
  {
    tier: 0,
    name: 'Free',
    storageBytes: 10 * BYTES_PER_GB,
    storageDisplay: '10 GB',
    priceMonthly: 0,
    priceYearly: 0,
    paddleProductId: '',
  },
  {
    tier: 1,
    name: 'Starter',
    storageBytes: 100 * BYTES_PER_GB,
    storageDisplay: '100 GB',
    priceMonthly: 1.99,
    priceYearly: 19.99,
    paddleProductId: 'pri_starter_monthly',
  },
  {
    tier: 2,
    name: 'Basic',
    storageBytes: 200 * BYTES_PER_GB,
    storageDisplay: '200 GB',
    priceMonthly: 2.99,
    priceYearly: 29.99,
    paddleProductId: 'pri_basic_monthly',
  },
  {
    tier: 3,
    name: 'Standard',
    storageBytes: 500 * BYTES_PER_GB,
    storageDisplay: '500 GB',
    priceMonthly: 6.49,
    priceYearly: 64.99,
    paddleProductId: 'pri_standard_monthly',
  },
  {
    tier: 4,
    name: 'Pro',
    storageBytes: 1 * BYTES_PER_TB,
    storageDisplay: '1 TB',
    priceMonthly: 11.99,
    priceYearly: 119.99,
    paddleProductId: 'pri_pro_monthly',
  },
  {
    tier: 5,
    name: 'Premium',
    storageBytes: 2 * BYTES_PER_TB,
    storageDisplay: '2 TB',
    priceMonthly: 19.99,
    priceYearly: 199.99,
    paddleProductId: 'pri_premium_monthly',
  },
  {
    tier: 6,
    name: 'Business',
    storageBytes: 5 * BYTES_PER_TB,
    storageDisplay: '5 TB',
    priceMonthly: 45.99,
    priceYearly: 459.99,
    paddleProductId: 'pri_business_monthly',
  },
  {
    tier: 7,
    name: 'Enterprise',
    storageBytes: 10 * BYTES_PER_TB,
    storageDisplay: '10 TB',
    priceMonthly: 84.99,
    priceYearly: 849.99,
    paddleProductId: 'pri_enterprise_monthly',
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

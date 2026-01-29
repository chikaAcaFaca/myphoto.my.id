import {
  BYTES_PER_GB,
  BYTES_PER_TB,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
} from '../constants';
import type { FileType } from '../types';

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format storage percentage
 */
export function formatStoragePercentage(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.round((used / limit) * 100);
}

/**
 * Get storage display string
 */
export function getStorageDisplay(bytes: number): string {
  if (bytes >= BYTES_PER_TB) {
    return `${(bytes / BYTES_PER_TB).toFixed(0)} TB`;
  }
  return `${(bytes / BYTES_PER_GB).toFixed(0)} GB`;
}

/**
 * Determine file type from MIME type
 */
export function getFileType(mimeType: string): FileType {
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) return 'video';
  if (SUPPORTED_DOCUMENT_TYPES.includes(mimeType)) return 'document';
  return 'other';
}

/**
 * Generate S3 key for file storage
 */
export function generateS3Key(
  userId: string,
  fileId: string,
  extension: string,
  type: 'original' | 'thumbnail' = 'original'
): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  if (type === 'thumbnail') {
    return `users/${userId}/thumbnails/${fileId}_thumb.webp`;
  }

  return `users/${userId}/originals/${year}/${month}/${fileId}.${extension}`;
}

/**
 * Generate S3 key for shared family files
 */
export function generateSharedS3Key(
  familyId: string,
  fileId: string,
  extension: string
): string {
  return `shared/${familyId}/${fileId}.${extension}`;
}

/**
 * Extract file extension from filename or MIME type
 */
export function getFileExtension(filename: string, mimeType?: string): string {
  // Try to get extension from filename
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && ext.length <= 5) return ext;

  // Fallback to MIME type mapping
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'application/pdf': 'pdf',
  };

  return mimeType ? mimeToExt[mimeType] || 'bin' : 'bin';
}

/**
 * Generate unique file ID
 */
export function generateFileId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

/**
 * Validate file size against limit
 */
export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}

/**
 * Check if MIME type is supported
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return (
    SUPPORTED_IMAGE_TYPES.includes(mimeType) ||
    SUPPORTED_VIDEO_TYPES.includes(mimeType) ||
    SUPPORTED_DOCUMENT_TYPES.includes(mimeType)
  );
}

/**
 * Format date for display
 */
export function formatDate(date: Date, format: 'short' | 'long' | 'relative' = 'short'): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (format === 'relative') {
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Group files by date
 */
export function groupFilesByDate<T extends { createdAt: Date }>(
  files: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const file of files) {
    const dateKey = file.createdAt.toISOString().split('T')[0];
    const existing = groups.get(dateKey) || [];
    existing.push(file);
    groups.set(dateKey, existing);
  }

  return groups;
}

/**
 * Calculate total storage from subscriptions
 */
export function calculateTotalStorage(
  subscriptions: { storageAmount: number; status: string }[],
  freeStorage: number
): number {
  const activeSubscriptionStorage = subscriptions
    .filter((sub) => sub.status === 'active')
    .reduce((total, sub) => total + sub.storageAmount, 0);

  return freeStorage + activeSubscriptionStorage;
}

/**
 * Slugify string for URLs
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate share link token
 */
export function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Parse EXIF date string to Date object
 */
export function parseExifDate(exifDate: string): Date | null {
  // EXIF format: "YYYY:MM:DD HH:MM:SS"
  const match = exifDate.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

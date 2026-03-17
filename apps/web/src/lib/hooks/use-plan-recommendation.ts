'use client';

import { useMemo } from 'react';
import { useAuthStore } from '../stores';
import { useStorage } from './use-storage';
import { STORAGE_TIERS } from '@myphoto/shared';

export function usePlanRecommendation() {
  const user = useAuthStore((state) => state.user);
  const { data: storage } = useStorage();

  return useMemo(() => {
    if (!user || !storage || !user.createdAt) return null;

    const createdAt = typeof user.createdAt === 'string'
      ? new Date(user.createdAt).getTime()
      : user.createdAt instanceof Date
        ? user.createdAt.getTime()
        : (user.createdAt as any)?.toMillis?.()
          ? (user.createdAt as any).toMillis()
          : Date.now();

    const daysActive = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    if (daysActive < 7 || storage.used === 0) return null;

    const dailyUploadRate = storage.used / daysActive;
    const monthlyUploadRate = dailyUploadRate * 30;
    const projectedUsage12m = storage.used + dailyUploadRate * 365;
    const daysUntilFull = storage.remaining > 0 ? Math.round(storage.remaining / dailyUploadRate) : 0;

    // Find smallest tier that fits projected 12-month usage
    const recommendedTier = STORAGE_TIERS.find(
      (t) => t.storageBytes >= projectedUsage12m && t.tier > 0
    ) || STORAGE_TIERS[STORAGE_TIERS.length - 1];

    return {
      recommendedTier,
      daysUntilFull,
      projectedUsage12m,
      monthlyUploadRate,
      monthlyUploadFormatted: formatBytesSimple(monthlyUploadRate),
    };
  }, [user, storage]);
}

function formatBytesSimple(bytes: number): string {
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

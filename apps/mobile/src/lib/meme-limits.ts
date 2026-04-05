/**
 * Meme usage tracking and tier-based limits.
 * Uses AsyncStorage for local tracking + derives tier from user's storageLimit.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_TIERS } from '@myphoto/shared';

const MEME_USAGE_KEY = 'meme_usage';

interface MemeUsage {
  daily: number;
  monthly: number;
  lastDayReset: string;  // YYYY-MM-DD
  lastMonthReset: string; // YYYY-MM
}

/**
 * Determine user's tier from their storageLimit.
 * Matches the closest tier by storage bytes.
 */
export function getUserTier(storageLimit: number): typeof STORAGE_TIERS[0] {
  // Find the tier that matches user's storage limit
  for (let i = STORAGE_TIERS.length - 1; i >= 0; i--) {
    if (storageLimit >= STORAGE_TIERS[i].storageBytes) {
      return STORAGE_TIERS[i];
    }
  }
  return STORAGE_TIERS[0]; // Free tier
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

async function getUsage(): Promise<MemeUsage> {
  try {
    const raw = await AsyncStorage.getItem(MEME_USAGE_KEY);
    if (!raw) return { daily: 0, monthly: 0, lastDayReset: getToday(), lastMonthReset: getCurrentMonth() };
    return JSON.parse(raw);
  } catch {
    return { daily: 0, monthly: 0, lastDayReset: getToday(), lastMonthReset: getCurrentMonth() };
  }
}

async function saveUsage(usage: MemeUsage): Promise<void> {
  await AsyncStorage.setItem(MEME_USAGE_KEY, JSON.stringify(usage));
}

/**
 * Reset counters if day/month changed.
 */
function resetIfNeeded(usage: MemeUsage): MemeUsage {
  const today = getToday();
  const month = getCurrentMonth();
  let updated = { ...usage };

  if (updated.lastDayReset !== today) {
    updated.daily = 0;
    updated.lastDayReset = today;
  }
  if (updated.lastMonthReset !== month) {
    updated.monthly = 0;
    updated.lastMonthReset = month;
  }
  return updated;
}

/**
 * Check if user can create a meme based on their tier limits.
 * Limits apply ONLY to AI-generated captions. Manual memes are unlimited for all users.
 * Returns { allowed, reason, remaining }
 */
export async function checkMemeLimit(storageLimit: number, isAiGenerated: boolean = true): Promise<{
  allowed: boolean;
  reason: string;
  remainingDaily: number;
  remainingMonthly: number;
}> {
  const tier = getUserTier(storageLimit);
  const isFree = tier.tier === 0;

  // Manual memes: Free = 0, Paid = unlimited
  if (!isAiGenerated) {
    if (isFree) {
      return {
        allowed: false,
        reason: 'Kreiranje memova je dostupno samo za plaćene planove. Nadogradite na Mini plan (€0.69/mes) za neograničeno memova!',
        remainingDaily: 0,
        remainingMonthly: 0,
      };
    }
    return { allowed: true, reason: '', remainingDaily: Infinity, remainingMonthly: Infinity };
  }

  // AI captions: Free = 2/day, Paid = per tier

  let usage = await getUsage();
  usage = resetIfNeeded(usage);
  await saveUsage(usage);

  const remainingDaily = Math.max(0, tier.memesPerDay - usage.daily);
  const remainingMonthly = Math.max(0, tier.memesPerMonth - usage.monthly);

  if (usage.daily >= tier.memesPerDay) {
    return {
      allowed: false,
      reason: `Dostigli ste dnevni limit od ${tier.memesPerDay} AI memova za ${tier.name} plan. Možete i dalje praviti memove ručno bez limita, ili nadogradite plan za više AI memova.`,
      remainingDaily: 0,
      remainingMonthly,
    };
  }

  if (usage.monthly >= tier.memesPerMonth) {
    return {
      allowed: false,
      reason: `Dostigli ste mesečni limit od ${tier.memesPerMonth} AI memova za ${tier.name} plan. Možete i dalje praviti memove ručno bez limita, ili nadogradite plan za više AI memova.`,
      remainingDaily,
      remainingMonthly: 0,
    };
  }

  return { allowed: true, reason: '', remainingDaily, remainingMonthly };
}

/**
 * Increment meme usage counter after successful creation.
 */
export async function incrementMemeUsage(): Promise<void> {
  let usage = await getUsage();
  usage = resetIfNeeded(usage);
  usage.daily += 1;
  usage.monthly += 1;
  await saveUsage(usage);
}

/**
 * Get current usage stats for display.
 */
export async function getMemeUsageStats(storageLimit: number): Promise<{
  tier: typeof STORAGE_TIERS[0];
  daily: number;
  monthly: number;
  maxDaily: number;
  maxMonthly: number;
}> {
  const tier = getUserTier(storageLimit);
  let usage = await getUsage();
  usage = resetIfNeeded(usage);
  await saveUsage(usage);

  return {
    tier,
    daily: usage.daily,
    monthly: usage.monthly,
    maxDaily: tier.memesPerDay,
    maxMonthly: tier.memesPerMonth,
  };
}

/**
 * GET /api/users/me
 *
 * Returns the *authenticated* user's full record — storageUsed, storageLimit,
 * subscription, referral fields, settings. The mobile app reads this on login
 * and refreshes it to keep the storage-quota gauge (and the proactive upsell)
 * accurate.
 *
 * NOTE: this static `me` segment intentionally takes precedence over the
 * dynamic `[id]` route. Previously `/api/users/me` fell through to
 * `users/[id]` with id="me", which looked up a non-existent `users/me`
 * document and 404'd — so the mobile `appUser` was always null and no quota
 * gating worked. Keep this file.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const data = userDoc.data()!;

    return NextResponse.json({
      id: userId,
      email: data.email || '',
      displayName: data.displayName || 'User',
      avatarUrl: data.avatarUrl || undefined,
      settings: data.settings || null,
      storageUsed: typeof data.storageUsed === 'number' ? data.storageUsed : 0,
      storageLimit: typeof data.storageLimit === 'number' ? data.storageLimit : 0,
      subscriptionIds: data.subscriptionIds || [],
      familyId: data.familyId || undefined,
      role: data.role || 'user',
      referralCode: data.referralCode || '',
      referralCount: data.referralCount || 0,
      referralBonusBytes: data.referralBonusBytes || 0,
      backupBonusClaimed: data.backupBonusClaimed || false,
      desktopBonusClaimed: data.desktopBonusClaimed || false,
      totalUploadedBytes: data.totalUploadedBytes || 0,
      referralQualified: data.referralQualified || false,
      createdAt: toIso(data.createdAt) || new Date(0).toISOString(),
    });
  } catch (error) {
    console.error('GET /api/users/me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

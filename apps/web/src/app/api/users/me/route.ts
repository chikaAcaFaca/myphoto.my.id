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
import { db, auth } from '@/lib/firebase-admin';
import { deleteUserAccount } from '@/lib/account-deletion';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
// Deleting a large library (thousands of objects) takes a while.
export const maxDuration = 300;

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

/**
 * DELETE /api/users/me — permanently delete the caller's account and data.
 *
 * Guarded twice: the body must carry `{ confirm: 'DELETE' }`, and the ID token
 * must come from a sign-in in the last REAUTH_WINDOW_S seconds. The second
 * check means a leaked or long-lived session cannot wipe an account; the
 * client answers `reauth-required` by asking the user to sign in again.
 */
const REAUTH_WINDOW_S = 10 * 60;

export async function DELETE(request: NextRequest) {
  const authResult = await verifyAuthWithRateLimit(request, 'api');
  if (!authResult.success) return authResult.response;
  const { userId } = authResult;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // empty body → falls through to the confirm check
  }
  if (body?.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Confirmation required', code: 'confirm-required' }, { status: 400 });
  }

  const token = request.headers.get('Authorization')!.split('Bearer ')[1];
  const decoded = await auth().verifyIdToken(token);
  const age = Math.floor(Date.now() / 1000) - (decoded.auth_time || 0);
  if (age > REAUTH_WINDOW_S) {
    return NextResponse.json(
      { error: 'Please sign in again to confirm', code: 'reauth-required' },
      { status: 403 }
    );
  }

  try {
    const report = await deleteUserAccount(userId);
    if (report.errors.length) console.error('Account deletion partial errors:', report.errors);
    return NextResponse.json({
      deleted: true,
      objectsDeleted: report.objectsDeleted,
      docsDeleted: report.docsDeleted,
      complete: report.errors.length === 0,
    });
  } catch (error) {
    console.error('DELETE /api/users/me error:', error);
    return NextResponse.json({ error: 'Account deletion failed' }, { status: 500 });
  }
}

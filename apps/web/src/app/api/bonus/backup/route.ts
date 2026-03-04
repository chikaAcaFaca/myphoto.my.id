import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { db } from '@/lib/firebase-admin';
import { BACKUP_BONUS } from '@myphoto/shared';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;

  const { userId } = auth;

  let body: { platform: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.platform || !['android', 'ios'].includes(body.platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userData = userDoc.data()!;

  if (userData.backupBonusClaimed === true) {
    return NextResponse.json({ error: 'Bonus already claimed' }, { status: 409 });
  }

  if (!userData.settings?.autoBackup) {
    return NextResponse.json({ error: 'Auto-backup must be enabled' }, { status: 400 });
  }

  const newStorageLimit = (userData.storageLimit || 0) + BACKUP_BONUS;

  await userRef.update({
    backupBonusClaimed: true,
    storageLimit: FieldValue.increment(BACKUP_BONUS),
  });

  return NextResponse.json({
    success: true,
    bonusBytes: BACKUP_BONUS,
    newStorageLimit,
  });
}

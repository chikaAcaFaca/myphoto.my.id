import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { initAdmin, db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { REFERRAL_BONUS, MAX_REFERRALS } from '@myphoto/shared';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  initAdmin();

  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;

  const { userId } = auth;

  let body: { referralCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { referralCode } = body;
  if (!referralCode || typeof referralCode !== 'string') {
    return NextResponse.json({ error: 'Missing referralCode' }, { status: 400 });
  }

  // Find referrer by referral code
  const referrerQuery = await db
    .collection('users')
    .where('referralCode', '==', referralCode)
    .limit(1)
    .get();

  if (referrerQuery.empty) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
  }

  const referrerDoc = referrerQuery.docs[0];
  const referrerData = referrerDoc.data();
  const referrerUserId = referrerDoc.id;

  // Cannot refer yourself
  if (referrerUserId === userId) {
    return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
  }

  // Check if referee already has a referrer
  const refereeDoc = await db.collection('users').doc(userId).get();
  if (!refereeDoc.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  const refereeData = refereeDoc.data()!;

  if (refereeData.referredBy) {
    return NextResponse.json({ error: 'Already referred' }, { status: 400 });
  }

  // Check referrer hasn't hit the max
  if ((referrerData.referralCount || 0) >= MAX_REFERRALS) {
    return NextResponse.json({ error: 'Referrer has reached maximum referrals' }, { status: 400 });
  }

  // Perform batch write
  const batch = db.batch();

  // Create referral record
  const referralRef = db.collection('referrals').doc();
  batch.set(referralRef, {
    referrerUserId,
    refereeUserId: userId,
    refereeEmail: refereeData.email || '',
    bonusBytes: REFERRAL_BONUS,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Update referrer: +1 count, +1GB bonus, +1GB storage
  batch.update(db.collection('users').doc(referrerUserId), {
    referralCount: FieldValue.increment(1),
    referralBonusBytes: FieldValue.increment(REFERRAL_BONUS),
    storageLimit: FieldValue.increment(REFERRAL_BONUS),
  });

  // Update referee: set referredBy, +1GB bonus, +1GB storage
  batch.update(db.collection('users').doc(userId), {
    referredBy: referrerUserId,
    referralBonusBytes: FieldValue.increment(REFERRAL_BONUS),
    storageLimit: FieldValue.increment(REFERRAL_BONUS),
  });

  await batch.commit();

  return NextResponse.json({
    success: true,
    bonusBytes: REFERRAL_BONUS,
  });
}

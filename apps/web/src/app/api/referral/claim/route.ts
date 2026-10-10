import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { initAdmin, db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { REFERRAL_BONUS, MAX_REFERRALS } from '@myphoto/shared';
import { notify } from '@/lib/inbox';

const REFEREE_MAX_ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  initAdmin();

  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;

  const { userId } = auth;

  let body: { referralCode?: string; source?: string; shareToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { referralCode, source, shareToken } = body;
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

  // Only a fresh signup can be credited to someone. A remembered ?ref= code
  // must not turn an existing user who later visits /register into a referral.
  const createdAtMs = refereeData.createdAt?.toMillis?.() ?? 0;
  if (Date.now() - createdAtMs > REFEREE_MAX_ACCOUNT_AGE_MS) {
    return NextResponse.json({ error: 'Account too old to be referred' }, { status: 400 });
  }

  // Check referrer hasn't hit the max
  if ((referrerData.referralCount || 0) >= MAX_REFERRALS) {
    return NextResponse.json({ error: 'Referrer has reached maximum referrals' }, { status: 400 });
  }

  // Create referral record — bonus is NOT applied yet.
  // Referee must upload 100MB to qualify (checked in upload confirmation API).
  const batch = db.batch();

  const referralRef = db.collection('referrals').doc();
  batch.set(referralRef, {
    referrerUserId,
    refereeUserId: userId,
    refereeEmail: refereeData.email || '',
    bonusBytes: REFERRAL_BONUS,
    qualified: false, // becomes true after referee uploads 100MB
    source: source || 'direct',       // 'share', 'direct', 'app', etc.
    shareToken: shareToken || null,    // which shared content brought this user
    createdAt: FieldValue.serverTimestamp(),
  });

  // Update referee: set referredBy (no storage bonus yet — must qualify first)
  batch.update(db.collection('users').doc(userId), {
    referredBy: referrerUserId,
  });

  await batch.commit();

  await notify(referrerUserId, {
    type: 'referral_joined',
    actorId: userId,
    actorName: refereeData.displayName || '',
  });

  return NextResponse.json({
    success: true,
    bonusBytes: REFERRAL_BONUS,
    message: 'Preporuka je zabeležena. Prijatelj koji vas je pozvao dobija 250 MB kada uploadujete prvih 100 MB.',
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin, db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { MAX_REFERRALS, MAX_REFERRAL_BONUS, REFERRAL_BONUS, BYTES_PER_GB, BYTES_PER_MB } from '@myphoto/shared';

export const dynamic = 'force-dynamic';

function formatStorage(bytes: number): string {
  if (bytes < BYTES_PER_GB) {
    const mb = bytes / BYTES_PER_MB;
    return mb % 1 === 0 ? `${mb} MB` : `${mb.toFixed(0)} MB`;
  }
  const gb = bytes / BYTES_PER_GB;
  return gb % 1 === 0 ? `${gb} GB` : `${gb.toFixed(1)} GB`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const masked = local.charAt(0) + '***';
  return `${masked}@${domain}`;
}

export async function GET(request: NextRequest) {
  initAdmin();

  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;

  const { userId } = auth;

  // Get user data
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  const userData = userDoc.data()!;

  // Get referrals list
  const referralsSnap = await db
    .collection('referrals')
    .where('referrerUserId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  const referrals = referralsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      email: maskEmail(data.refereeEmail || ''),
      date: data.createdAt?.toDate()?.toISOString()?.split('T')[0] || '',
      qualified: data.qualified || false,
      bonus: formatStorage(data.bonusBytes || REFERRAL_BONUS),
    };
  });

  const bonusBytes = userData.referralBonusBytes || 0;
  const referralCode = userData.referralCode || '';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mycamerabackup.com';

  return NextResponse.json({
    referralCode,
    referralCount: userData.referralCount || 0,
    maxReferrals: MAX_REFERRALS,
    bonusBytes,
    bonusPerReferral: REFERRAL_BONUS,
    bonusPerReferralFormatted: formatStorage(REFERRAL_BONUS),
    bonusFormatted: formatStorage(bonusBytes),
    maxBonusFormatted: formatStorage(MAX_REFERRAL_BONUS),
    referralLink: `${baseUrl}/register?ref=${referralCode}`,
    referrals,
  });
}

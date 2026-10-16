import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { REFERRAL_BONUS } from '@myphoto/shared';
import { claimReferral } from '@/lib/referral';

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

  const result = await claimReferral(userId, referralCode, source || 'direct', shareToken);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    bonusBytes: REFERRAL_BONUS,
    message: 'Preporuka je zabeležena. Prijatelj koji vas je pozvao dobija 250 MB kada uploadujete prvih 100 MB.',
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { auth as getAdminAuth } from '@/lib/firebase-admin';
import { checkIpRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/custom-token
 * Exchanges a Firebase ID token for a Firebase custom token for the same
 * user. The desktop app uses it to sign its built-in web window (MemeWall,
 * meme creator) into the account it is already logged into, so the user
 * doesn't sign in twice — see /desktop-session.
 *
 * Only a real Firebase ID token is accepted (not a disk-share API key): the
 * custom token grants a full session, which the caller already has.
 */
export async function POST(request: NextRequest) {
  const rl = await checkIpRateLimit(request, 'api');
  if (!rl.success) return rl.response;

  const header = request.headers.get('Authorization') || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken, true);
    const customToken = await getAdminAuth().createCustomToken(decoded.uid);
    return NextResponse.json({ customToken });
  } catch (error) {
    console.error('Custom token exchange failed:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

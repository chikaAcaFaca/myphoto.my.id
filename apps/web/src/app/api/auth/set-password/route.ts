import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// POST /api/auth/set-password — let the signed-in user set (or replace)
// their Firebase Auth password. Lets Google-OAuth users add a password
// so they can log into desktop/CLI with email+password too. The Admin
// SDK skips the re-auth step that the client SDK normally requires —
// callers are already authenticated via the Bearer token at this point.
export async function POST(request: NextRequest) {
  const authResult = await verifyAuthWithRateLimit(request, 'api');
  if (!authResult.success) return authResult.response;
  const { userId } = authResult;

  const body = await request.json().catch(() => ({}));
  const password = typeof body?.password === 'string' ? body.password : '';

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Lozinka mora imati najmanje 8 karaktera.' },
      { status: 400 }
    );
  }
  if (password.length > 128) {
    return NextResponse.json(
      { error: 'Lozinka je preduga (max 128 karaktera).' },
      { status: 400 }
    );
  }

  try {
    await auth().updateUser(userId, { password });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('set-password error:', err);
    const msg = err instanceof Error ? err.message : 'Greška';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

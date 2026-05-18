import { NextRequest, NextResponse } from 'next/server';
import { checkIpRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// POST /api/auth/refresh — exchange a Firebase refresh token for a fresh
// ID token + refresh token via Google's securetoken endpoint. Used by
// the desktop sync app so it can keep running past the 1h ID-token
// expiry without forcing the user back through the browser. The refresh
// token itself authenticates the call, so this route is public (rate
// limited by IP) — the caller proves they're legitimate by holding a
// non-revoked refresh token issued by Firebase.
export async function POST(request: NextRequest) {
  const rl = await checkIpRateLimit(request, 'api');
  if (!rl.success) return rl.response;

  const body = await request.json().catch(() => ({}));
  const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : '';
  if (!refreshToken) {
    return NextResponse.json({ error: 'refreshToken required' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      }
    );

    if (!res.ok) {
      // Common cases: TOKEN_EXPIRED, USER_DISABLED, USER_NOT_FOUND,
      // INVALID_REFRESH_TOKEN. We surface the Google code as-is so the
      // client can decide whether to re-prompt for login.
      const err = await res.json().catch(() => ({}));
      const code = err?.error?.message || 'REFRESH_FAILED';
      return NextResponse.json({ error: code }, { status: 401 });
    }

    const data = await res.json();
    return NextResponse.json({
      // Google's securetoken response uses snake_case; we normalise to
      // match /api/auth/login so the desktop has one shape to handle.
      token: data.id_token,
      refreshToken: data.refresh_token,
      expiresIn: parseInt(data.expires_in, 10),
      userId: data.user_id,
    });
  } catch (e) {
    console.error('refresh error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

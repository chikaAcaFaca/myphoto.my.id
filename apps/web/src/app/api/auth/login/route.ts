import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { checkIpRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * Login endpoint for desktop/mobile apps.
 * Accepts email + password, returns a Firebase ID token.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await checkIpRateLimit(request, 'api');
    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Use Firebase REST API to verify email/password and get ID token
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    if (!firebaseRes.ok) {
      const err = await firebaseRes.json();
      const errorCode = err.error?.message || 'AUTH_ERROR';

      const messages: Record<string, string> = {
        EMAIL_NOT_FOUND: 'Nalog sa ovim emailom ne postoji',
        INVALID_PASSWORD: 'Pogrešna lozinka',
        USER_DISABLED: 'Nalog je deaktiviran',
        INVALID_LOGIN_CREDENTIALS: 'Pogrešan email ili lozinka',
      };

      return NextResponse.json(
        { error: messages[errorCode] || 'Prijava nije uspela' },
        { status: 401 }
      );
    }

    const data = await firebaseRes.json();

    return NextResponse.json({
      token: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: parseInt(data.expiresIn),
      userId: data.localId,
      email: data.email,
    });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

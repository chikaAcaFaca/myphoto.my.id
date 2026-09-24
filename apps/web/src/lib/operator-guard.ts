import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Gate for operator-only routes (/api/debug, /api/admin/*, /api/setup/*).
 * These expose powers no end user should have — listing every account,
 * changing any quota, rewriting bucket CORS — so they are NOT tied to a
 * normal login. The caller must send `x-debug-secret` equal to DEBUG_SECRET.
 * Secure by default: with DEBUG_SECRET unset every request is refused.
 */
export function isOperator(request: NextRequest): boolean {
  const secret = process.env.DEBUG_SECRET;
  if (!secret) return false;
  const provided = request.headers.get('x-debug-secret') || '';
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function operatorForbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

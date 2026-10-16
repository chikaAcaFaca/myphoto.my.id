import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

const MAX_TOKENS = 10;

async function readToken(request: NextRequest): Promise<string | null> {
  const body = await request.json().catch(() => ({}));
  const token = body?.token;
  return typeof token === 'string' && token.length > 20 && token.length < 4096 ? token : null;
}

// POST /api/push/register { token } — remember this device's FCM token.
export async function POST(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const token = await readToken(request);
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const ref = db.collection('users').doc(auth.userId);
  await db.runTransaction(async (tx) => {
    const tokens: string[] = (await tx.get(ref)).data()?.pushTokens || [];
    // Newest last; keep a handful of devices per account.
    const next = [...tokens.filter((t) => t !== token), token].slice(-MAX_TOKENS);
    tx.set(ref, { pushTokens: next }, { merge: true });
  });
  return NextResponse.json({ success: true });
}

// DELETE /api/push/register { token } — on sign-out.
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const token = await readToken(request);
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });
  await db.collection('users').doc(auth.userId).update({ pushTokens: FieldValue.arrayRemove(token) });
  return NextResponse.json({ success: true });
}

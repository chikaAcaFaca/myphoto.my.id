import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { db } from '@/lib/firebase-admin';
import { unsubscribeToken } from '@/lib/storage-nudge';

export const dynamic = 'force-dynamic';

/**
 * Unsubscribe from the "storage is filling up" emails. The link carries the
 * uid and an HMAC of it, so no login is needed and nobody can unsubscribe
 * someone else. GET = link in the email; POST = Gmail/Outlook one-click
 * (List-Unsubscribe-Post). Over-quota warnings before deletion still go out:
 * they protect the user's files.
 */
async function unsubscribe(request: NextRequest): Promise<boolean> {
  const u = request.nextUrl.searchParams.get('u') || '';
  const t = request.nextUrl.searchParams.get('t') || '';
  const expected = u ? unsubscribeToken(u) : null;
  if (!expected || t.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(t), Buffer.from(expected))) return false;
  const ref = db.collection('users').doc(u);
  if (!(await ref.get()).exists) return false;
  await ref.update({ storageEmailsOptOut: true });
  return true;
}

function page(ok: boolean) {
  const msg = ok
    ? 'Odjavljen si sa mejlova o popunjenosti prostora. · You are unsubscribed from storage emails.'
    : 'Link nije ispravan ili je istekao. · This link is invalid.';
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MyPhoto</title></head>` +
      `<body style="font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:48px 16px;text-align:center">` +
      `<p style="font-size:20px;font-weight:bold;color:#0ea5e9">MyPhoto</p><p style="max-width:420px;margin:0 auto">${msg}</p>` +
      `<p><a href="/" style="color:#0ea5e9">myphotomy.space</a></p></body></html>`,
    { status: ok ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(request: NextRequest) {
  return page(await unsubscribe(request));
}

export async function POST(request: NextRequest) {
  const ok = await unsubscribe(request);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}

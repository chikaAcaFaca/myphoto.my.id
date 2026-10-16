import { NextRequest, NextResponse } from 'next/server';
import { runContentPipeline } from '@/lib/content-pipeline';

export const dynamic = 'force-dynamic';
// Instagram processes a Reel before it can be published (up to ~3 min).
export const maxDuration = 300;

/** Daily social video pipeline (see lib/content-pipeline.ts). Vercel Cron, Bearer CRON_SECRET. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await runContentPipeline();
    console.log('content cron', summary);
    return NextResponse.json(summary);
  } catch (e: any) {
    console.error('content cron failed', e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

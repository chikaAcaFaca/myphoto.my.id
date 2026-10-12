import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { VIDEO_SCRIPTS } from '@/content/video-scripts';
import { contentVideoUrl, getContentConfig, setContentPaused } from '@/lib/content-pipeline';
import { heygenIsConfigured } from '@/lib/social/heygen';
import { zernioIsConfigured } from '@/lib/social/zernio';
import { metaIsConfigured } from '@/lib/social/meta';

export const dynamic = 'force-dynamic';

async function requireAdmin(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return { error: auth.response };
  const me = (await db.collection('users').doc(auth.userId).get()).data();
  if (me?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { userId: auth.userId };
}

/** GET: queue with preview links, config and which channels are set up. */
export async function GET(request: NextRequest) {
  const a = await requireAdmin(request);
  if ('error' in a) return a.error;

  const cfg = await getContentConfig();
  const snap = await db.collection('contentQueue').get();
  const byId = new Map(snap.docs.map((d) => [d.id, d.data()]));
  const items = await Promise.all(
    VIDEO_SCRIPTS.map(async (s, i) => {
      const d = byId.get(s.id);
      const status = d?.status || 'queued';
      const hasVideo = ['ready', 'approved', 'posted'].includes(status);
      return {
        id: s.id,
        order: i + 1,
        series: s.series,
        title: s.title,
        script: s.script,
        caption: s.caption,
        status,
        error: d?.error || null,
        postErrors: d?.postErrors || null,
        results: d?.results || null,
        postedAt: d?.postedAt || null,
        videoUrl: hasVideo ? await contentVideoUrl(s.id).catch(() => null) : null,
      };
    })
  );

  return NextResponse.json({
    paused: cfg.paused,
    autoApproveFrom: cfg.autoApproveFrom.toISOString(),
    channels: { heygen: heygenIsConfigured(), tiktokYoutube: zernioIsConfigured(), facebookInstagram: metaIsConfigured() },
    items,
  });
}

/** POST { action: 'approve' | 'reject' | 'retry', id } or { action: 'pause' | 'resume' }. */
export async function POST(request: NextRequest) {
  const a = await requireAdmin(request);
  if ('error' in a) return a.error;
  const body = await request.json().catch(() => ({}));
  const action = body?.action;

  if (action === 'pause' || action === 'resume') {
    await setContentPaused(action === 'pause');
    return NextResponse.json({ ok: true });
  }

  const id = typeof body?.id === 'string' ? body.id : '';
  if (!VIDEO_SCRIPTS.some((s) => s.id === id)) return NextResponse.json({ error: 'Unknown id' }, { status: 400 });
  const ref = db.collection('contentQueue').doc(id);
  const cur = (await ref.get()).data();

  if (action === 'approve' || action === 'reject') {
    if (cur?.status !== 'ready' && cur?.status !== 'approved') {
      return NextResponse.json({ error: 'Only a rendered, unposted video can be approved or rejected' }, { status: 409 });
    }
    await ref.update({ status: action === 'approve' ? 'approved' : 'rejected', approvedBy: a.userId });
    return NextResponse.json({ ok: true });
  }
  if (action === 'retry') {
    if (cur?.status !== 'failed' && cur?.status !== 'rejected') {
      return NextResponse.json({ error: 'Only failed or rejected videos can be redone' }, { status: 409 });
    }
    // Back to the queue: the next cron run renders it again.
    await ref.delete();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

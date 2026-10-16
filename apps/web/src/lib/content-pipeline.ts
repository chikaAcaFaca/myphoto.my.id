import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { generateDownloadUrl, putObjectBuffer } from '@/lib/s3';
import { MAX_SCRIPT_WORDS, VIDEO_SCRIPTS } from '@/content/video-scripts';
import { createAvatarVideo, getVideoStatus, heygenIsConfigured } from '@/lib/social/heygen';
import { publishVideo, zernioIsConfigured } from '@/lib/social/zernio';
import { metaIsConfigured, publishFacebookVideo, publishInstagramReel } from '@/lib/social/meta';

/**
 * Social video pipeline, run by the daily cron (/api/cron/content):
 *
 *   queued → rendering (HeyGen) → ready → approved → posted
 *                                   └→ rejected        └→ failed (kept with error)
 *
 * Scripts come from content/video-scripts.ts in order. A small buffer of
 * rendered videos is kept ahead so a slow render never skips a posting day.
 * Until `config/content.autoApproveFrom` new videos wait in /admin for the
 * owner's OK; after it they are approved automatically. `paused` stops
 * rendering and posting.
 */

const DAY = 24 * 60 * 60 * 1000;
const BUFFER = 3; // rendered-but-unposted videos to keep ready
const RENDER_TIMEOUT_MS = 2 * DAY;
// Posting days (0 = Sunday): Monday, Wednesday, Friday, Sunday.
const POST_DAYS = new Set([1, 3, 5, 0]);
const APPROVAL_PERIOD_DAYS = 14;

export type ContentStatus = 'rendering' | 'ready' | 'approved' | 'posted' | 'rejected' | 'failed';

const col = () => db.collection('contentQueue');
const configRef = () => db.collection('config').doc('content');

export interface ContentConfig {
  paused: boolean;
  autoApproveFrom: Date;
}

export async function getContentConfig(): Promise<ContentConfig> {
  const snap = await configRef().get();
  if (!snap.exists) {
    // First run: the owner approves by hand for the first two weeks.
    const cfg = { paused: false, autoApproveFrom: new Date(Date.now() + APPROVAL_PERIOD_DAYS * DAY) };
    await configRef().set(cfg);
    return cfg;
  }
  const d = snap.data()!;
  return { paused: !!d.paused, autoApproveFrom: d.autoApproveFrom?.toDate?.() ?? new Date(0) };
}

export async function setContentPaused(paused: boolean) {
  await configRef().set({ paused }, { merge: true });
}

function videoKey(id: string) {
  return `public/content/${id}.mp4`;
}

/** A URL the social platforms can fetch the video from (valid 1 day). */
export async function contentVideoUrl(id: string): Promise<string> {
  return generateDownloadUrl(videoKey(id), { expiresIn: DAY / 1000, contentType: 'video/mp4' });
}

/** Returns false when rendering should stop for today (no script, or HeyGen failed). */
async function startNextRender(summary: Record<string, number>): Promise<boolean> {
  const existing = new Set((await col().select().get()).docs.map((d) => d.id));
  const next = VIDEO_SCRIPTS.find((s) => !existing.has(s.id));
  if (!next) {
    summary.scriptsExhausted = 1;
    return false;
  }
  const ref = col().doc(next.id);
  // Videos must stay under ~30 s; a long script is not worth paying for.
  const words = next.script.split(/\s+/).length;
  if (words > MAX_SCRIPT_WORDS) {
    await ref.create({ status: 'failed', title: next.title, error: `Tekst ima ${words} reči (najviše ${MAX_SCRIPT_WORDS})`, createdAt: FieldValue.serverTimestamp() });
    return true; // not a HeyGen problem: go on with the next script
  }
  // create() so two overlapping runs never render the same script twice.
  await ref.create({ status: 'rendering', title: next.title, createdAt: FieldValue.serverTimestamp() });
  try {
    const heygenVideoId = await createAvatarVideo(next.script, next.title);
    await ref.update({ heygenVideoId, renderStartedAt: Date.now() });
    summary.renderStarted = (summary.renderStarted || 0) + 1;
    return true;
  } catch (e: any) {
    // Usually an empty HeyGen wallet or a bad key: stop, so the next
    // scripts are not burnt on the same error. /admin can retry it.
    await ref.update({ status: 'failed', failedAt: Date.now(), error: String(e?.message || e).slice(0, 500) });
    summary.renderFailed = (summary.renderFailed || 0) + 1;
    return false;
  }
}

async function pollRenders(cfg: ContentConfig, summary: Record<string, number>) {
  const rendering = await col().where('status', '==', 'rendering').get();
  for (const doc of rendering.docs) {
    const d = doc.data();
    if (!d.heygenVideoId) continue;
    try {
      const st = await getVideoStatus(d.heygenVideoId);
      if (st.status === 'completed' && st.videoUrl) {
        // HeyGen links expire; keep our own copy.
        const res = await fetch(st.videoUrl);
        if (!res.ok) throw new Error(`download ${res.status}`);
        await putObjectBuffer(videoKey(doc.id), Buffer.from(await res.arrayBuffer()), 'video/mp4');
        const auto = Date.now() >= cfg.autoApproveFrom.getTime();
        await doc.ref.update({ status: auto ? 'approved' : 'ready', renderedAt: Date.now(), ...(auto ? { approvedBy: 'auto' } : {}) });
        summary.rendered = (summary.rendered || 0) + 1;
      } else if (st.status === 'failed' || (d.renderStartedAt && Date.now() - d.renderStartedAt > RENDER_TIMEOUT_MS)) {
        await doc.ref.update({ status: 'failed', failedAt: Date.now(), error: st.error || 'render timed out' });
        summary.renderFailed = (summary.renderFailed || 0) + 1;
      }
    } catch (e: any) {
      console.error('content: render poll failed', doc.id, e?.message || e);
      summary.errors = (summary.errors || 0) + 1;
    }
  }
}

async function postOne(summary: Record<string, number>) {
  // Today already posted? One video per posting day.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const postedToday = await col().where('postedAt', '>=', todayStart.getTime()).limit(1).get();
  if (!postedToday.empty || !POST_DAYS.has(new Date().getUTCDay())) return;

  const approved = (await col().where('status', '==', 'approved').get()).docs;
  const order = new Map(VIDEO_SCRIPTS.map((s, i) => [s.id, i]));
  approved.sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
  const doc = approved[0];
  if (!doc) return;
  const script = VIDEO_SCRIPTS.find((s) => s.id === doc.id);
  if (!script) return;

  const url = await contentVideoUrl(doc.id);
  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  if (zernioIsConfigured()) {
    try {
      results.zernio = await publishVideo({ videoUrl: url, caption: script.caption, youtubeTitle: script.title, idempotencyKey: `content-${doc.id}` });
    } catch (e: any) {
      errors.zernio = String(e?.message || e).slice(0, 300);
    }
  }
  if (metaIsConfigured()) {
    if (process.env.META_PAGE_ID) {
      try {
        results.facebook = await publishFacebookVideo(url, script.title, script.caption);
      } catch (e: any) {
        errors.facebook = String(e?.message || e).slice(0, 300);
      }
    }
    if (process.env.META_IG_USER_ID) {
      try {
        results.instagram = await publishInstagramReel(url, script.caption);
      } catch (e: any) {
        errors.instagram = String(e?.message || e).slice(0, 300);
      }
    }
  }

  const anyOk = Object.keys(results).length > 0;
  await doc.ref.update({
    status: anyOk ? 'posted' : 'failed',
    postedAt: Date.now(),
    results,
    ...(Object.keys(errors).length ? { postErrors: errors } : {}),
  });
  summary[anyOk ? 'posted' : 'postFailed'] = 1;
}

export async function runContentPipeline(): Promise<Record<string, number>> {
  const summary: Record<string, number> = {};
  const cfg = await getContentConfig();
  if (cfg.paused) return { paused: 1 };
  if (!heygenIsConfigured()) return { notConfigured: 1 };

  await pollRenders(cfg, summary);

  const recentFailure = await col().where('failedAt', '>=', Date.now() - DAY).limit(1).get();
  if (recentFailure.empty) {
    const pending = await col().where('status', 'in', ['rendering', 'ready', 'approved']).count().get();
    for (let n = pending.data().count; n < BUFFER; n++) {
      if (!(await startNextRender(summary))) break;
    }
  } else {
    summary.renderHeldAfterFailure = 1;
  }

  if (zernioIsConfigured() || metaIsConfigured()) await postOne(summary);
  else summary.noChannels = 1;
  return summary;
}

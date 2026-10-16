/**
 * Zernio (formerly Late): publishes to TikTok and YouTube through one API.
 * The first two connected accounts are free; TikTok and YouTube use them.
 *
 * Env:
 *   ZERNIO_API_KEY            zernio.com → Settings → API keys
 *   ZERNIO_TIKTOK_ACCOUNT_ID  from GET /v1/accounts (listZernioAccounts)
 *   ZERNIO_YOUTUBE_ACCOUNT_ID
 */

const BASE = 'https://zernio.com/api/v1';

function headers(extra: Record<string, string> = {}) {
  const k = process.env.ZERNIO_API_KEY;
  if (!k) throw new Error('ZERNIO_API_KEY is not set');
  return { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json', Accept: 'application/json', ...extra };
}

export function zernioIsConfigured(): boolean {
  return !!process.env.ZERNIO_API_KEY && !!(process.env.ZERNIO_TIKTOK_ACCOUNT_ID || process.env.ZERNIO_YOUTUBE_ACCOUNT_ID);
}

export async function listZernioAccounts(): Promise<Array<{ id: string; platform: string; name?: string }>> {
  const res = await fetch(`${BASE}/accounts`, { headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Zernio accounts ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  const list = body.accounts || body.data || [];
  return list.map((a: any) => ({ id: a.id || a._id, platform: a.platform, name: a.username || a.name }));
}

/**
 * Publish one vertical video now to the configured TikTok and YouTube
 * accounts. `idempotencyKey` makes a retried cron run return the same post.
 */
export async function publishVideo(opts: {
  videoUrl: string;
  caption: string;
  youtubeTitle: string;
  idempotencyKey: string;
}): Promise<{ id: string; status: string; urls: Record<string, string> }> {
  const platforms: any[] = [];
  if (process.env.ZERNIO_TIKTOK_ACCOUNT_ID) {
    platforms.push({ platform: 'tiktok', accountId: process.env.ZERNIO_TIKTOK_ACCOUNT_ID });
  }
  if (process.env.ZERNIO_YOUTUBE_ACCOUNT_ID) {
    platforms.push({
      platform: 'youtube',
      accountId: process.env.ZERNIO_YOUTUBE_ACCOUNT_ID,
      platformSpecificData: {
        title: opts.youtubeTitle.slice(0, 100),
        visibility: 'public',
        madeForKids: false,
        // The presenter is an AI avatar: disclose it, as YouTube requires.
        containsSyntheticMedia: true,
        categoryId: '26', // Howto & Style
      },
    });
  }
  if (!platforms.length) throw new Error('No Zernio account configured');

  const res = await fetch(`${BASE}/posts`, {
    method: 'POST',
    headers: headers({ 'Idempotency-Key': opts.idempotencyKey }),
    body: JSON.stringify({
      content: opts.caption,
      mediaItems: [{ type: 'video', url: opts.videoUrl }],
      platforms,
      publishNow: true,
      tiktokSettings: {
        privacyLevel: 'PUBLIC_TO_EVERYONE',
        allowComment: true,
        allowDuet: true,
        allowStitch: true,
        contentPreviewConfirmed: true,
        expressConsentGiven: true,
        videoMadeWithAi: true,
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 207) {
    throw new Error(`Zernio post ${res.status}: ${JSON.stringify(body).slice(0, 400)}`);
  }
  const post = body.post || body;
  const urls: Record<string, string> = {};
  for (const p of post.platforms || []) {
    if (p.platformPostUrl) urls[p.platform] = p.platformPostUrl;
  }
  return { id: post._id || post.postId || '', status: post.status || String(res.status), urls };
}

/**
 * Facebook Page videos and Instagram Reels through the Meta Graph API,
 * directly (no paid middleman). An app in development mode may publish to
 * Pages and Instagram accounts its own admins manage, without App Review.
 *
 * Env:
 *   META_PAGE_ID            the MyPhoto Facebook Page id
 *   META_PAGE_TOKEN         long-lived Page access token (does not expire
 *                           when made from a long-lived user token)
 *   META_IG_USER_ID         Instagram professional account linked to the Page
 *   META_GRAPH_VERSION      optional, default v23.0
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function graph(path: string) {
  return `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v23.0'}/${path}`;
}

function token(): string {
  const t = process.env.META_PAGE_TOKEN;
  if (!t) throw new Error('META_PAGE_TOKEN is not set');
  return t;
}

export function metaIsConfigured(): boolean {
  return !!process.env.META_PAGE_TOKEN && !!(process.env.META_PAGE_ID || process.env.META_IG_USER_ID);
}

async function post(path: string, params: Record<string, string>): Promise<any> {
  const res = await fetch(graph(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: token() }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(`Meta ${path} ${res.status}: ${JSON.stringify(body.error || body).slice(0, 300)}`);
  return body;
}

async function get(path: string, fields: string): Promise<any> {
  const res = await fetch(`${graph(path)}?fields=${fields}&access_token=${encodeURIComponent(token())}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(`Meta ${path} ${res.status}: ${JSON.stringify(body.error || body).slice(0, 300)}`);
  return body;
}

/** Upload a video to the Facebook Page from a URL. Returns the video id. */
export async function publishFacebookVideo(videoUrl: string, title: string, description: string): Promise<string> {
  if (!process.env.META_PAGE_ID) throw new Error('META_PAGE_ID is not set');
  const body = await post(`${process.env.META_PAGE_ID}/videos`, { file_url: videoUrl, title, description });
  return body.id;
}

/**
 * Publish an Instagram Reel from a URL. Instagram fetches and processes the
 * video first, so this waits (up to ~3 min) for the container to finish.
 */
export async function publishInstagramReel(videoUrl: string, caption: string): Promise<string> {
  const ig = process.env.META_IG_USER_ID;
  if (!ig) throw new Error('META_IG_USER_ID is not set');
  const container = await post(`${ig}/media`, { media_type: 'REELS', video_url: videoUrl, caption, share_to_feed: 'true' });
  for (let i = 0; i < 36; i++) {
    await sleep(5000);
    const { status_code } = await get(container.id, 'status_code');
    if (status_code === 'FINISHED') {
      const published = await post(`${ig}/media_publish`, { creation_id: container.id });
      return published.id;
    }
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Instagram container ${status_code}`);
  }
  throw new Error('Instagram container still processing after 3 min');
}

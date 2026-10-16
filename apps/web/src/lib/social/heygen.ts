/**
 * HeyGen API (pay-as-you-go wallet, separate from the web subscription).
 *
 * Env:
 *   HEYGEN_API_KEY      app.heygen.com → Settings → API
 *   HEYGEN_AVATAR_ID    the owner's avatar ("Čikaca")
 *   HEYGEN_VOICE_ID     the avatar's (cloned) voice
 *   HEYGEN_AVATAR_TYPE  'avatar' (default) or 'talking_photo'
 *   HEYGEN_BACKGROUND_URL  optional studio backdrop (1080x1920 image). When
 *                       set, the avatar's own background is removed and this
 *                       one is placed behind it, so every video looks like
 *                       it was shot in the same YouTube studio.
 */

const BASE = 'https://api.heygen.com';

function key(): string {
  const k = process.env.HEYGEN_API_KEY;
  if (!k) throw new Error('HEYGEN_API_KEY is not set');
  return k;
}

export function heygenIsConfigured(): boolean {
  return !!(process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID && process.env.HEYGEN_VOICE_ID);
}

async function call(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'X-Api-Key': key(), 'Content-Type': 'application/json', Accept: 'application/json', ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) {
    throw new Error(`HeyGen ${path} ${res.status}: ${JSON.stringify(body?.error || body).slice(0, 300)}`);
  }
  return body.data;
}

/** Start a vertical 1080x1920 video with burned-in captions. Returns the video id. */
export async function createAvatarVideo(script: string, title: string): Promise<string> {
  const type = process.env.HEYGEN_AVATAR_TYPE === 'talking_photo' ? 'talking_photo' : 'avatar';
  const character =
    type === 'talking_photo'
      ? { type, talking_photo_id: process.env.HEYGEN_AVATAR_ID }
      : { type, avatar_id: process.env.HEYGEN_AVATAR_ID, avatar_style: 'normal' };
  const backdrop = process.env.HEYGEN_BACKGROUND_URL;
  const data = await call('/v2/video/generate', {
    method: 'POST',
    body: JSON.stringify({
      title,
      caption: true,
      dimension: { width: 1080, height: 1920 },
      video_inputs: [
        {
          character: backdrop ? { ...character, matting: true } : character,
          voice: { type: 'text', input_text: script, voice_id: process.env.HEYGEN_VOICE_ID },
          ...(backdrop ? { background: { type: 'image', url: backdrop, fit: 'cover' } } : {}),
        },
      ],
    }),
  });
  if (!data?.video_id) throw new Error('HeyGen returned no video_id');
  return data.video_id as string;
}

export interface HeygenStatus {
  status: 'pending' | 'waiting' | 'processing' | 'completed' | 'failed' | string;
  /** Prefer the captioned file: most people watch muted. */
  videoUrl: string | null;
  error: string | null;
}

export async function getVideoStatus(videoId: string): Promise<HeygenStatus> {
  const data = await call(`/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`);
  return {
    status: data?.status,
    videoUrl: data?.video_url_caption || data?.video_url || null,
    error: data?.error ? JSON.stringify(data.error).slice(0, 300) : null,
  };
}

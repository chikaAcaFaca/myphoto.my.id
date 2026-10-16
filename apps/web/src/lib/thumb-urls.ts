import { generateDownloadUrl } from '@/lib/s3';

/**
 * Presigned thumbnail URLs for a file record, so list responses carry them
 * and clients load thumbnails straight from storage — no /api/thumbnail
 * function call (and storage HEAD) per image. Signing is local, no network.
 */
export async function thumbUrls(data: { smallThumbKey?: string; thumbnailKey?: string }) {
  const out: { smallThumbUrl?: string; thumbnailUrl?: string } = {};
  try {
    if (data.smallThumbKey) out.smallThumbUrl = await generateDownloadUrl(data.smallThumbKey);
    if (data.thumbnailKey) out.thumbnailUrl = await generateDownloadUrl(data.thumbnailKey);
  } catch {
    // A missing URL just falls back to /api/thumbnail on the client.
  }
  return out;
}

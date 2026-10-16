import { NextResponse } from 'next/server';

type Data = Record<string, any>;

/** A share link is usable while active and not past its expiry. */
export function isShareUsable(share: Data | undefined | null): boolean {
  if (!share || !share.isActive) return false;
  const exp = share.expiresAt;
  if (exp) {
    const ms = typeof exp.toMillis === 'function' ? exp.toMillis() : new Date(exp).getTime();
    if (!Number.isNaN(ms) && ms <= Date.now()) return false;
  }
  return true;
}

/**
 * Whether a share link grants access to this file: the link is usable, the
 * file belongs to whoever created the link, is not in the trash, and is the
 * shared file (or one of the shared album's files).
 */
export function shareAccess(
  share: Data | undefined | null,
  fileId: string,
  file: Data
): { authorized: true } | { authorized: false; response: NextResponse } {
  const deny = (error: string, status: number) =>
    ({ authorized: false as const, response: NextResponse.json({ error }, { status }) });
  if (!isShareUsable(share)) return deny('Unauthorized', 401);
  if (!share!.userId || file.userId !== share!.userId || file.isTrashed) return deny('File not available', 403);
  if (share!.type === 'album') {
    const ids: string[] = share!.albumFileIds || [];
    return ids.includes(fileId) ? { authorized: true } : deny('File not in shared album', 403);
  }
  return share!.fileId === fileId ? { authorized: true } : deny('File not matching share', 403);
}

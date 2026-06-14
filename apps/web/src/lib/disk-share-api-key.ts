import { NextRequest } from 'next/server';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { db } from '@/lib/firebase-admin';

/**
 * Programmatic API-key access to a single disk share.
 *
 * A disk share (`diskShares/<shareToken>`) can have ONE API key attached so an
 * external automated service (no browser, no Firebase login) can read/write the
 * shared folder tree. The key authorises the caller AS THE OWNER, but ONLY for
 * that one share — every route still runs `verifyDescendant`, so the key can
 * never reach files outside the shared folder.
 *
 * The key material lives in a separate, server-only collection
 * (`diskShareKeys/<shareToken>`) because `diskShares` is publicly readable
 * (Firestore rule `allow read: if true` for the shared-link landing page). We
 * never store the raw key — only its SHA-256 hash — and never expose the hash
 * to clients.
 *
 * Raw key format (self-identifying so the automat sends a single header):
 *   dsk_<shareToken>_<secret>
 * where shareToken is the 32-char alphanumeric share id and secret is 64 hex
 * chars (256 bits). Neither part contains '_', so parsing is unambiguous.
 */

export const DISK_API_KEY_HEADER = 'x-disk-api-key';
const KEY_PREFIX = 'dsk_';

export type DiskApiKeyPermission = 'read' | 'readwrite';

export interface DiskShareKeyDoc {
  shareToken: string;
  ownerId: string;
  folderId: string;
  type: string;
  apiKeyHash: string;
  apiKeyPermission: DiskApiKeyPermission;
  last4: string;
  isActive: boolean;
}

export interface ResolvedDiskApiKey {
  shareToken: string;
  ownerId: string;
  folderId: string;
  type: string;
  permission: DiskApiKeyPermission;
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** Generate a fresh API key for a share. Returns the raw key (shown ONCE) plus
 *  the hash + last4 to persist. */
export function generateDiskShareApiKey(shareToken: string): {
  rawKey: string;
  hash: string;
  last4: string;
} {
  const secret = randomBytes(32).toString('hex'); // 64 hex chars, 256 bits
  const rawKey = `${KEY_PREFIX}${shareToken}_${secret}`;
  return {
    rawKey,
    hash: sha256Hex(rawKey),
    last4: secret.slice(-4),
  };
}

/** Parse a raw key into its share token + secret. Returns null if malformed. */
export function parseDiskShareApiKey(
  raw: string | null | undefined
): { shareToken: string; secret: string } | null {
  if (!raw || !raw.startsWith(KEY_PREFIX)) return null;
  const rest = raw.slice(KEY_PREFIX.length);
  const sep = rest.indexOf('_');
  if (sep <= 0) return null;
  const shareToken = rest.slice(0, sep);
  const secret = rest.slice(sep + 1);
  if (!shareToken || !secret) return null;
  // shareToken is alphanumeric (generateShareToken), secret is hex.
  if (!/^[A-Za-z0-9]+$/.test(shareToken) || !/^[a-f0-9]+$/.test(secret)) return null;
  return { shareToken, secret };
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Resolve the X-Disk-Api-Key header on a request to an authorised disk share.
 * Returns null when the header is absent or the key is invalid/revoked — the
 * caller then falls back to Firebase auth (or rejects). The key is matched
 * against the share token embedded in the key itself, so no extra param needed.
 */
export async function resolveDiskShareApiKey(
  request: NextRequest
): Promise<ResolvedDiskApiKey | null> {
  const raw = request.headers.get(DISK_API_KEY_HEADER);
  const parsed = parseDiskShareApiKey(raw);
  if (!parsed) return null;

  const keyDoc = await db.collection('diskShareKeys').doc(parsed.shareToken).get();
  if (!keyDoc.exists) return null;

  const data = keyDoc.data() as DiskShareKeyDoc;
  if (!data.isActive || !data.apiKeyHash) return null;

  // Constant-time compare of the full-key hash.
  if (!safeEqualHex(sha256Hex(raw as string), data.apiKeyHash)) return null;

  return {
    shareToken: data.shareToken,
    ownerId: data.ownerId,
    folderId: data.folderId,
    type: data.type,
    permission: data.apiKeyPermission,
  };
}

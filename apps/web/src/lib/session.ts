import crypto from 'crypto';

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function getSecret(): string {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }
  // Derive from the Firebase service-account private key (server-only). The
  // old fallbacks — the PUBLIC web API key, then a hard-coded string — made
  // media-access cookies forgeable by anyone, so they are gone: with neither
  // secret present we refuse to sign or verify at all.
  if (process.env.FIREBASE_PRIVATE_KEY) {
    return crypto.createHash('sha256').update(process.env.FIREBASE_PRIVATE_KEY).digest('hex');
  }
  throw new Error('SESSION_SECRET (or FIREBASE_PRIVATE_KEY) must be set');
}

/**
 * Create an HMAC-signed session token.
 * Format: userId:timestamp:hmac
 */
export function createSessionToken(userId: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${userId}:${timestamp}`;
  const hmac = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex');
  return `${payload}:${hmac}`;
}

/**
 * Verify an HMAC-signed session token.
 * Returns the userId if valid and not expired, null otherwise.
 */
export function verifySessionToken(token: string): string | null {
  const parts = token.split(':');
  if (parts.length !== 3) return null;

  const [userId, timestampStr, providedHmac] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return null;

  // Check expiry (7 days)
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > SESSION_MAX_AGE) return null;

  // Verify HMAC
  const payload = `${userId}:${timestampStr}`;
  const expectedHmac = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (providedHmac.length !== expectedHmac.length) return null;
  const isValid = crypto.timingSafeEqual(
    Buffer.from(providedHmac, 'hex'),
    Buffer.from(expectedHmac, 'hex')
  );

  return isValid ? userId : null;
}

export const SESSION_COOKIE_NAME = 'myphoto_session';
export { SESSION_MAX_AGE };

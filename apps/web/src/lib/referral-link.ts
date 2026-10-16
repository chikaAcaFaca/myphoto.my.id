// A visitor can land on any page with ?ref=CODE (a shared meme, photo or
// profile link) and only register later, after browsing. Remember the code so
// /register can still credit whoever shared the link.

const STORAGE_KEY = 'myphoto_ref';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const REF_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

export function isValidRef(code: string | null | undefined): code is string {
  return !!code && REF_PATTERN.test(code);
}

export function storeRef(code: string) {
  if (!isValidRef(code)) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {}
}

export function getStoredRef(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw);
    if (!isValidRef(code) || Date.now() - at > MAX_AGE_MS) return null;
    return code;
  } catch {
    return null;
  }
}

export function clearStoredRef() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/** Append the sharer's referral code to a link they are about to share. */
export function withRef(url: string, code: string | null | undefined): string {
  if (!isValidRef(code)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}ref=${encodeURIComponent(code)}`;
}

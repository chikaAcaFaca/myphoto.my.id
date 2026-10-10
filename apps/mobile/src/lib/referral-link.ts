/** Append the sharer's referral code to a link they are about to share, so a
 *  friend who signs up through it is credited to them. */
export function withRef(url: string, code: string | null | undefined): string {
  if (!code || !/^[A-Za-z0-9_-]{4,64}$/.test(code)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}ref=${encodeURIComponent(code)}`;
}

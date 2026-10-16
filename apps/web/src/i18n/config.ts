export const LOCALES = ['en', 'sr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'lang';

/** BCP-47 tags for dates / numbers. */
export const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', sr: 'sr-Latn-RS' };

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/**
 * Pick a locale from an Accept-Language header. Serbian and its mutually
 * intelligible neighbours get Serbian; everyone else — and requests with no
 * header at all (crawlers, curl) — get English.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const base = tag.split('-')[0];
    if (['sr', 'hr', 'bs', 'sh', 'me', 'cnr'].includes(base)) return 'sr';
    if (base === 'en') return 'en';
  }
  return DEFAULT_LOCALE;
}

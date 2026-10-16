// Translation helpers for non-React code (stores, plain lib functions) and a
// tiny plural helper shared by the components namespace.
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from '@/i18n/config';
import { getActiveMessages } from '@/i18n/active';
import { translate, type MessageKey, type TParams } from '@/i18n/translate';

/** Current locale from the `lang` cookie (client only; English on the server). */
export function staticLocale(): Locale {
  const active = getActiveMessages();
  if (active) return active.locale;
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1];
  if (isLocale(value)) return value;
  // No cookie yet: mirror the server's Accept-Language guess via navigator.
  const nav = (typeof navigator !== 'undefined' && navigator.language) || '';
  return /^(sr|hr|bs|sh|me|cnr)\b/i.test(nav) ? 'sr' : DEFAULT_LOCALE;
}

/** Translate outside React (no hooks available). */
export function tStatic(key: MessageKey, params?: TParams): string {
  // The provider registers the page's dictionary before any user action can
  // trigger a message; before that, the key itself is the safest output.
  return translate(getActiveMessages()?.messages, null, key, params);
}

export type PluralForm = 'one' | 'few' | 'other';

/**
 * CLDR plural category for `count`: English uses one/other, Serbian
 * one/few/other. Message keys that vary by count provide all three forms.
 */
export function pluralForm(count: number, locale: Locale = staticLocale()): PluralForm {
  const cat = new Intl.PluralRules(INTL_LOCALE[locale]).select(count);
  return cat === 'one' || cat === 'few' ? cat : 'other';
}

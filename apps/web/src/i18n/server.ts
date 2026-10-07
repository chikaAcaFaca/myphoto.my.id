// Server-only: imports next/headers.
import { cookies, headers } from 'next/headers';
import { isLocale, localeFromAcceptLanguage, LOCALE_COOKIE, type Locale } from './config';
import { DICTIONARIES, FALLBACK_MESSAGES } from './dictionaries';
import { translate, type MessageKey, type TParams } from './translate';

/** Locale for the current request: cookie first, then Accept-Language. */
export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return localeFromAcceptLanguage((await headers()).get('accept-language'));
}

/** Server-component translator: `const t = await getT(); t('common.save')`. */
export async function getT() {
  const locale = await getLocale();
  const messages = DICTIONARIES[locale];
  return (key: MessageKey, params?: TParams) => translate(messages, FALLBACK_MESSAGES, key, params);
}

'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { INTL_LOCALE, LOCALE_COOKIE, type Locale } from './config';
import { setActiveMessages } from './active';
import { translate, type MessageKey, type TParams } from './translate';

interface I18nValue {
  locale: Locale;
  /** BCP-47 tag for toLocaleDateString / Intl.NumberFormat. */
  intlLocale: string;
  t: (key: MessageKey, params?: TParams) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * `messages` is the active language's dictionary only, passed down from the
 * server layout — importing every dictionary here would ship all languages
 * to every page. The Serbian dictionary is type-checked complete against
 * English, so no client-side fallback is needed.
 */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: unknown;
  children: ReactNode;
}) {
  setActiveMessages(locale, messages);
  const t = useCallback(
    (key: MessageKey, params?: TParams) => translate(messages, null, key, params),
    [messages]
  );

  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Server components and <html lang> read the cookie — reload so every
    // part of the page switches together.
    window.location.reload();
  }, []);

  const value = useMemo(
    () => ({ locale, intlLocale: INTL_LOCALE[locale], t, setLocale }),
    [locale, t, setLocale]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Shorthand: `const t = useT(); t('common.save')`. */
export function useT() {
  return useI18n().t;
}

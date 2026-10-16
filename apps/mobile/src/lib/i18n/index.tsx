// Tiny typed i18n — no dependencies.
//
// - en.ts is the source of truth; sr.ts is typed against it.
// - Language = manual override (AsyncStorage) or device locale:
//   sr/hr/bs/sh/me/cnr → Serbian (Latin), everything else → English.
// - React components: `const { t, tp } = useT();`
// - Non-React modules (alerts in libs, notifications): `import { t } from '@/lib/i18n'`
//   — reads the current language at call time.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { en, type Dictionary } from './en';
import { sr } from './sr';

export type Language = 'en' | 'sr';
export type LanguagePreference = Language | 'auto';

const LANGUAGE_KEY = '@myphoto/language';

const dictionaries: Record<Language, Dictionary> = { en, sr };

// ── Key types ──────────────────────────────────────────────────────────────

type PluralNode = { one: string; few: string; other: string };

/** Every dotted path that ends in a string, e.g. 'common.cancel'. */
type LeafKeys<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : LeafKeys<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Every dotted path that points at a { one, few, other } node. */
type PluralKeys<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? never
    : T[K] extends PluralNode
      ? `${P}${K}`
      : PluralKeys<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TKey = LeafKeys<Dictionary>;
export type TPluralKey = PluralKeys<Dictionary>;
export type TParams = Record<string, string | number | null | undefined>;

// ── Locale detection ───────────────────────────────────────────────────────

const SERBIAN_LIKE = ['sr', 'hr', 'bs', 'sh', 'me', 'cnr'];

export function detectDeviceLanguage(): Language {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const base = locale.toLowerCase().split(/[-_]/)[0];
    return SERBIAN_LIKE.includes(base) ? 'sr' : 'en';
  } catch {
    return 'en';
  }
}

// ── Module-level state (shared by hook and non-hook t) ─────────────────────

let currentPreference: LanguagePreference = 'auto';
let currentLanguage: Language = detectDeviceLanguage();

export function getLanguage(): Language {
  return currentLanguage;
}

/** BCP-47 tag suitable for toLocaleDateString / Intl formatters. */
export function getDateLocale(lang: Language = currentLanguage): string {
  return lang === 'sr' ? 'sr-Latn-RS' : 'en-US';
}

function lookup(lang: Language, key: string): unknown {
  let node: unknown = dictionaries[lang];
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}

function translate(lang: Language, key: string, params?: TParams): string {
  let value = lookup(lang, key);
  if (typeof value !== 'string' && lang !== 'en') value = lookup('en', key);
  if (typeof value !== 'string') return key;
  return interpolate(value, params);
}

function pluralCategory(lang: Language, count: number): keyof PluralNode {
  const n = Math.abs(Math.trunc(count));
  if (lang === 'en') return n === 1 ? 'one' : 'other';
  // Serbian/Croatian/Bosnian integer rules
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'other';
}

function translatePlural(lang: Language, key: string, count: number, params?: TParams): string {
  const category = pluralCategory(lang, count);
  return translate(lang, `${key}.${category}`, { count, ...params });
}

/** Non-hook translator for modules outside React (reads current language). */
export function t(key: TKey, params?: TParams): string {
  return translate(currentLanguage, key, params);
}

/** Non-hook plural translator. `{count}` is filled automatically. */
export function tp(key: TPluralKey, count: number, params?: TParams): string {
  return translatePlural(currentLanguage, key, count, params);
}

// ── React ──────────────────────────────────────────────────────────────────

interface I18nContextValue {
  language: Language;
  preference: LanguagePreference;
  setPreference: (pref: LanguagePreference) => void;
  t: (key: TKey, params?: TParams) => string;
  tp: (key: TPluralKey, count: number, params?: TParams) => string;
  dateLocale: string;
}

function makeValue(
  language: Language,
  preference: LanguagePreference,
  setPreference: (pref: LanguagePreference) => void,
): I18nContextValue {
  return {
    language,
    preference,
    setPreference,
    t: (key, params) => translate(language, key, params),
    tp: (key, count, params) => translatePlural(language, key, count, params),
    dateLocale: getDateLocale(language),
  };
}

const I18nContext = createContext<I18nContextValue>(
  makeValue(currentLanguage, currentPreference, () => {}),
);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>(currentPreference);
  const [language, setLanguage] = useState<Language>(currentLanguage);

  const apply = useCallback((pref: LanguagePreference) => {
    const lang: Language = pref === 'auto' ? detectDeviceLanguage() : pref;
    currentPreference = pref;
    currentLanguage = lang;
    setPreferenceState(pref);
    setLanguage(lang);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then((val) => {
        if (val === 'en' || val === 'sr' || val === 'auto') apply(val);
      })
      .catch(() => {});
  }, [apply]);

  const setPreference = useCallback(
    (pref: LanguagePreference) => {
      apply(pref);
      AsyncStorage.setItem(LANGUAGE_KEY, pref).catch(() => {});
    },
    [apply],
  );

  const value = useMemo(
    () => makeValue(language, preference, setPreference),
    [language, preference, setPreference],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  return useContext(I18nContext);
}

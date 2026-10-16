import type { Locale } from './config';

/**
 * The dictionary for the page's language, registered by <I18nProvider> on the
 * client. Lets non-React code translate without importing every language
 * into the browser bundle (the server hands the client only one dictionary).
 */
let active: { locale: Locale; messages: unknown } | null = null;

export function setActiveMessages(locale: Locale, messages: unknown) {
  active = { locale, messages };
}

export function getActiveMessages() {
  return active;
}

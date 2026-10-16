import type { Locale } from './config';
import { en } from './messages/en';
import { sr } from './messages/sr';

export const DICTIONARIES: Record<Locale, unknown> = { en, sr };
export { en as FALLBACK_MESSAGES };

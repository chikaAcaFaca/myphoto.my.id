import type { Messages } from './messages/en';

/** Dot-path keys of the English dictionary, e.g. "common.save". */
type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = T extends string
  ? never
  : { [K in keyof T & string]: T[K] extends string ? K : Join<K, Paths<T[K]>> }[keyof T & string];
export type MessageKey = Paths<Messages>;

export type TParams = Record<string, string | number>;

function lookup(messages: unknown, key: string): string | undefined {
  let node: any = messages;
  for (const part of key.split('.')) {
    if (node == null) return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * Translate `key`, falling back to English, then to the key itself.
 * `{name}` placeholders are filled from `params`.
 */
export function translate(messages: unknown, fallback: unknown, key: string, params?: TParams): string {
  const raw = lookup(messages, key) ?? lookup(fallback, key) ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

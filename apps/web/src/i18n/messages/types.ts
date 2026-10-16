/** Same shape as the English dictionary, but any string values — so the
 *  Serbian file must define exactly the same keys (missing = compile error). */
export type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };

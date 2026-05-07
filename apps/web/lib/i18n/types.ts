/**
 * Supported UI locales.
 *
 * Add a new locale by:
 *   1. extending this union
 *   2. adding the dictionary file in `messages/<code>.ts`
 *   3. exporting it from `messages/index.ts`
 *   4. adding a label entry in every existing dictionary's `language` block
 */
export type Locale = 'en' | 'pt-br';

/**
 * What the user *picks* in the switcher. `'system'` defers to the
 * browser via `navigator.language`, mirroring the theme switcher's
 * behaviour.
 */
export type LocalePreference = Locale | 'system';

export const SUPPORTED_LOCALES: ReadonlyArray<Locale> = ['en', 'pt-br'];
export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie name shared by server (SSR) and client (toggle). */
export const LOCALE_COOKIE = 'synapse_locale';

/** Validate / coerce arbitrary input into a known preference. */
export function asLocalePreference(value: string | null | undefined): LocalePreference {
  if (!value) return 'system';
  if (value === 'system') return 'system';
  if ((SUPPORTED_LOCALES as ReadonlyArray<string>).includes(value)) {
    return value as Locale;
  }
  return 'system';
}

/** Coerce arbitrary input into a known *resolved* locale. */
export function asLocale(value: string | null | undefined): Locale {
  if (value && (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(value)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Resolve `'system'` against a navigator-language string.
 * Examples:
 *   'pt-BR' → 'pt-br'
 *   'pt'    → 'pt-br'
 *   'en-US' → 'en'
 *   'fr'    → DEFAULT_LOCALE
 */
export function resolveSystemLocale(navLanguage: string | undefined): Locale {
  if (!navLanguage) return DEFAULT_LOCALE;
  const lower = navLanguage.toLowerCase();
  if (lower.startsWith('pt')) return 'pt-br';
  if (lower.startsWith('en')) return 'en';
  return DEFAULT_LOCALE;
}

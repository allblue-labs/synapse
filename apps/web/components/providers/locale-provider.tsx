'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  asLocale,
  asLocalePreference,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  resolveSystemLocale,
  type Locale,
  type LocalePreference,
} from '@/lib/i18n/types';
import {MESSAGES, resolveMessage, type MessageKey} from '@/lib/i18n/messages';

interface LocaleContextValue {
  /** The fully resolved locale used for rendering (`'system'` is never returned). */
  locale: Locale;
  /** What the user picked in the switcher. */
  preference: LocalePreference;
  /** Update the preference (persists to cookie + re-renders the tree). */
  setPreference: (next: LocalePreference) => void;
  /** Translate a dot-notation key against the active locale. */
  t: (key: MessageKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  /** Resolved locale rendered by the server — used for the first paint
      so SSR matches the client. */
  initialLocale: Locale;
  /** The raw preference value read server-side from the cookie. */
  initialPreference: LocalePreference;
  children: ReactNode;
}

/**
 * Locale provider — cookie-backed, with `'system'` resolution mirroring
 * `next-themes`. The server passes the resolved `initialLocale` and the
 * raw `initialPreference`; the client may override after mount if the
 * preference is `'system'` and `navigator.language` differs.
 */
export function LocaleProvider({
  initialLocale,
  initialPreference,
  children,
}: LocaleProviderProps) {
  const [preference, setPrefState] = useState<LocalePreference>(initialPreference);
  const [locale, setLocale]         = useState<Locale>(initialLocale);

  // Resolve `'system'` once on mount. Done in an effect so it never
  // executes during SSR — guarantees the first paint matches the cookie.
  useEffect(() => {
    if (preference === 'system') {
      const navLang =
        typeof navigator !== 'undefined' ? navigator.language : undefined;
      setLocale(resolveSystemLocale(navLang));
    } else {
      setLocale(preference);
    }
  }, [preference]);

  const setPreference = useCallback((next: LocalePreference) => {
    setPrefState(next);
    if (typeof document !== 'undefined') {
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      // 1-year persistence — preference is low-stakes and survives logout.
      document.cookie =
        `${LOCALE_COOKIE}=${encodeURIComponent(next)};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax${secure}`;
    }
  }, []);

  const t = useCallback(
    (key: MessageKey) => resolveMessage(MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE], key),
    [locale],
  );

  // Keep <html lang> in sync after a client-side switch so screen
  // readers and search engines see the actual language.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({locale, preference, setPreference, t}),
    [locale, preference, setPreference, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Read the resolved locale + the translator. Throws if used outside the provider. */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale() must be used inside <LocaleProvider>.');
  }
  return ctx;
}

/**
 * Tiny helper for components that only need translation, not the full
 * context. Returns just `t`.
 */
export function useTranslator(): (key: MessageKey) => string {
  return useLocale().t;
}

// Re-export validators so consumers (root layout) can read the cookie
// without importing from two paths.
export {asLocale, asLocalePreference};

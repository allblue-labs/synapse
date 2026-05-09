'use client';

import {ThemeProvider} from 'next-themes';
import type {ReactNode} from 'react';
import {LocaleProvider} from './locale-provider';
import {ToastProvider} from '@/components/ui/toast';
import type {Locale, LocalePreference} from '@/lib/i18n/types';

interface ProvidersProps {
  children: ReactNode;
  /** Resolved locale rendered by the server. */
  initialLocale: Locale;
  /** Raw preference value from the cookie (`'system' | 'en' | 'pt-br'`). */
  initialLocalePreference: LocalePreference;
}

export function Providers({children, initialLocale, initialLocalePreference}: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LocaleProvider
        initialLocale={initialLocale}
        initialPreference={initialLocalePreference}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

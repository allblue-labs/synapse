import type {Metadata} from 'next';
import {Inter} from 'next/font/google';
import {cookies} from 'next/headers';
import {Providers} from '@/components/providers/providers';
import {
  asLocale,
  asLocalePreference,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  resolveSystemLocale,
} from '@/lib/i18n/types';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Synapse — AI agent orchestration for modern businesses',
    template: '%s — Synapse',
  },
  description:
    'Connect channels, deploy AI agents, and automate conversations. Synapse is the orchestration platform for AI-powered messaging at scale.',
  icons: {icon: '/logo.png'},
  openGraph: {
    title: 'Synapse — AI agent orchestration',
    description: 'Connect channels, deploy AI agents, automate conversations at scale.',
    type: 'website',
  },
};

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value;

  const preference = asLocalePreference(cookieValue);
  // Server can't read navigator.language. When the user's preference is
  // 'system' we render the platform default and let the client fix up
  // after mount (mirrors how next-themes handles the `system` theme).
  const locale = preference === 'system'
    ? resolveSystemLocale(undefined)   // → DEFAULT_LOCALE
    : asLocale(preference);

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        <Providers initialLocale={locale} initialLocalePreference={preference}>
          {children}
        </Providers>
      </body>
    </html>
  );
}

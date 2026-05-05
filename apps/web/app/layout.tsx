import type {Metadata} from 'next';
import {Providers} from '@/components/providers/providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Synapse',
    template: '%s — Synapse',
  },
  description: 'AI agent orchestration for modern businesses.',
  icons: {icon: '/logo.png'},
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = 'en';
  const messages = {};

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}

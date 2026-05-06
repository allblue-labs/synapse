import type {Metadata} from 'next';
import {Inter} from 'next/font/google';
import {Providers} from '@/components/providers/providers';
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

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        <Providers locale="en" messages={{}}>
          {children}
        </Providers>
      </body>
    </html>
  );
}

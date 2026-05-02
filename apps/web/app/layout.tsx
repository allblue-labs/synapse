import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Synapse',
  description: 'AI-powered conversational agents for business outcomes.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

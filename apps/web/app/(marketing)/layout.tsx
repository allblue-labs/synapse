import {PublicNav} from '@/components/marketing/public-nav';
import type {ReactNode} from 'react';

/**
 * Shared chrome for public marketing routes (/pricing, /modules, ...).
 * The root `/` page also uses PublicNav but renders it inline — that
 * stays unchanged so the landing layout is free to compose its hero
 * however it wants.
 */
export default function MarketingLayout({children}: {children: ReactNode}) {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <PublicNav />
      <main className="container-page py-16 sm:py-20">{children}</main>
    </div>
  );
}

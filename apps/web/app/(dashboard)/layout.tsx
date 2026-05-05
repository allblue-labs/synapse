import {TopNav} from '@/components/nav/top-nav';
import {SynapseBg} from '@/components/background/synapse-bg';
import type {ReactNode} from 'react';

export default function DashboardLayout({children}: {children: ReactNode}) {
  return (
    <div className="relative min-h-screen bg-white dark:bg-zinc-950">
      <SynapseBg />
      <div className="relative z-10">
        <TopNav />
        <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
      </div>
    </div>
  );
}

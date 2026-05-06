import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {TopNav} from '@/components/nav/top-nav';
import {SegmentNav} from '@/components/nav/segment-nav';
import type {ReactNode} from 'react';

export default async function DashboardLayout({children}: {children: ReactNode}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('synapse_token');
  if (!token?.value) redirect('/login');

  return (
    <div className="relative min-h-screen bg-zinc-50/60 dark:bg-zinc-950">
      {/* App-wide subtle grid — same identity as landing, dialed down */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-grid-soft mask-fade-bottom opacity-70"
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <TopNav />
        <SegmentNav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

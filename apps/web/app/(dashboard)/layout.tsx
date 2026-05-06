import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {TopNav} from '@/components/nav/top-nav';
import {SegmentNav} from '@/components/nav/segment-nav';
import {api, ApiError, type CurrentUser} from '@/lib/api';
import type {ReactNode} from 'react';

export default async function DashboardLayout({children}: {children: ReactNode}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('synapse_token')?.value;
  if (!token) redirect('/login');

  // Fetch the session user on every navigation. If the token is invalid/expired
  // the API returns 401 → we treat it as a hard sign-out and bounce to /login.
  let user: CurrentUser | null = null;
  try {
    user = await api.users.me({token});
  } catch (err) {
    if (err instanceof ApiError && err.isUnauthorized) {
      redirect('/login?expired=1');
    }
    // Other failures (network, 5xx): render the shell anyway — UI degrades gracefully.
  }

  return (
    <div className="relative min-h-screen bg-zinc-50/60 dark:bg-zinc-950">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-grid-soft mask-fade-bottom opacity-70"
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <TopNav user={user} />
        <SegmentNav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

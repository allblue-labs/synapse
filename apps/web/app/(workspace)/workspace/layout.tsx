import {redirect} from 'next/navigation';
import {TopNav} from '@/components/nav/top-nav';
import {SegmentNav} from '@/components/nav/segment-nav';
import {CurrentUserProvider} from '@/components/auth/can';
import {api, ApiError, type CurrentUser} from '@/lib/api';
import type {ReactNode} from 'react';

/**
 * Dashboard shell — RSC.
 *
 * The session lives in the HttpOnly `synapse_session` cookie. We never
 * read its value; instead we ask the API to identify the caller via
 * `/users/me`. The unified API client lazily forwards the request's
 * cookies on the server, so this is a single call with no plumbing.
 *
 *   • 200  → render the shell with the resolved user
 *   • 401  → cookie missing/expired → bounce to /login
 *   • 5xx  → render the shell anyway; UI degrades gracefully
 */
export default async function DashboardLayout({children}: {children: ReactNode}) {
  let user: CurrentUser | null = null;

  try {
    user = await api.users.me();
  } catch (err) {
    if (err instanceof ApiError && err.isUnauthorized) {
      redirect('/login?expired=1');
    }
    // Network / 5xx — keep going. Pages will show fallbacks.
  }

  return (
    <CurrentUserProvider user={user}>
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
    </CurrentUserProvider>
  );
}

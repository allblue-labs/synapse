import {redirect} from 'next/navigation';
import {TopNav} from '@/components/nav/top-nav';
import {SegmentNav} from '@/components/nav/segment-nav';
import {CurrentUserProvider} from '@/components/auth/can';
import {TenantInvalidator} from '@/components/auth/tenant-invalidator';
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
      <TenantInvalidator />
      <div className="relative min-h-screen bg-zinc-50/60 dark:bg-zinc-950">
        {/* Layered ambient background — grid, mesh, glow.
            Pinned to the viewport so it stays consistent through page
            transitions instead of redrawing per route. */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-grid-soft mask-fade-bottom opacity-70" />
          <div className="absolute -left-32 top-24 h-[520px] w-[520px] rounded-full bg-brand-500/10 blur-[120px] dark:bg-brand-500/15" />
          <div className="absolute right-[-12rem] top-[28rem] h-[440px] w-[440px] rounded-full bg-accent-500/8 blur-[120px] dark:bg-accent-500/15" />
          <div className="absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white/85 to-transparent dark:from-zinc-950/90" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
          <TopNav user={user} />
          <SegmentNav />

          {/* Asymmetric content shell — wider than max-w-7xl, with
              left-biased gutter that lets dense pages breathe and
              tighter pages still self-center via inner max-widths. */}
          <main className="container-shell flex-1 px-6 pb-16 pt-8 lg:px-10 page-enter">
            {children}
          </main>
        </div>
      </div>
    </CurrentUserProvider>
  );
}

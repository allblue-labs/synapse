import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {ShieldAlert} from 'lucide-react';
import {SegmentNav} from '@/components/nav/segment-nav';
import {CurrentUserProvider} from '@/components/auth/can';
import {api, ApiError, type CurrentUser} from '@/lib/api';
import {LanguageToggle} from '@/components/i18n/language-toggle';
import {PlatformNav} from './_components/platform-nav';
import type {ReactNode} from 'react';

/**
 * Platform admin shell — RSC.
 *
 * The visual identity here is intentionally distinct from the workspace
 * shell (cooler accent, "control center" vibe). Same auth model — the
 * session cookie + `/users/me` — but with an additional platform-admin
 * role check that the *backend* enforces on every protected platform
 * route. Until the platform-admin role lands client-side, this layout
 * just shows a clear banner so operators know they're in the admin
 * surface and not the tenant workspace.
 */
export default async function PlatformLayout({children}: {children: ReactNode}) {
  // Cheap presence check first — middleware already redirects on missing
  // cookie, so this is a defence-in-depth gate.
  const cookieStore = await cookies();
  if (!cookieStore.get('synapse_session')) {
    redirect('/login?next=/platform/overview');
  }

  let user: CurrentUser | null = null;
  try {
    user = await api.users.me();
  } catch (err) {
    if (err instanceof ApiError && err.isUnauthorized) {
      redirect('/login?expired=1');
    }
  }

  return (
    <CurrentUserProvider user={user}>
      <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950">
        {/* Distinctive admin chrome: cool slate gradient + denser grid. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-grid-soft mask-fade-bottom opacity-60"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 bg-gradient-to-b from-indigo-500/[0.06] via-transparent to-transparent dark:from-indigo-400/[0.08]"
        />

        <div className="relative z-10 flex min-h-screen flex-col">
          {/* Admin top bar — visually distinct from the workspace's TopNav. */}
          <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/85">
            <div className="mx-auto flex h-14 max-w-7xl items-center px-6">
              <Link href="/platform/overview" className="mr-6 flex shrink-0 items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="Synapse"
                  width={26}
                  height={26}
                  className="rounded-md ring-1 ring-black/5 dark:ring-white/10"
                  priority
                />
                <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Synapse
                </span>
                <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  <ShieldAlert size={10} />
                  Platform
                </span>
              </Link>

              <div className="mr-5 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />

              <PlatformNav />

              <div className="ml-auto flex items-center gap-1.5">
                <LanguageToggle />
                {user && (
                  <Link
                    href="/workspace/overview"
                    className="rounded-lg border border-zinc-200 bg-white/60 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    ← Workspace
                  </Link>
                )}
              </div>
            </div>
          </header>

          <SegmentNav />
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
            {children}
          </main>
        </div>
      </div>
    </CurrentUserProvider>
  );
}

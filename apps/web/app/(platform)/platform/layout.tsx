import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {ShieldAlert} from 'lucide-react';
import {SegmentNav} from '@/components/nav/segment-nav';
import {PlatformSidebar} from '@/components/nav/workspace-sidebar';
import {CurrentUserProvider} from '@/components/auth/can';
import {api, ApiError, type CurrentUser} from '@/lib/api';
import {LanguageToggle} from '@/components/i18n/language-toggle';
import {CommandLauncher} from '@/components/nav/command-launcher';
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
        {/* Distinctive admin chrome: cooler indigo cast + layered halos. */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-grid-soft mask-fade-bottom opacity-60" />
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-500/[0.07] via-transparent to-transparent dark:from-indigo-400/[0.10]" />
          <div className="absolute -left-32 top-32 h-[460px] w-[460px] rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/20" />
          <div className="absolute right-[-10rem] top-[26rem] h-[420px] w-[420px] rounded-full bg-violet-500/10 blur-[120px] dark:bg-violet-500/15" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
          {/* Admin top bar — slim, visually distinct via the Platform pill. */}
          <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/80 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/80">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

            <div className="flex h-14 items-center px-4 lg:px-6">
              <Link href="/platform/overview" className="group mr-3 flex shrink-0 items-center gap-2">
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

              <div className="flex-1" />

              <div className="flex items-center gap-1.5">
                <CommandLauncher />
                <LanguageToggle />
                {user && (
                  <Link
                    href="/workspace/overview"
                    className="rounded-lg border border-zinc-200 bg-white/60 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    ← Workspace
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/* Sidebar + main grid — same shape as the workspace shell so
              operators don't relearn navigation when crossing surfaces. */}
          <div className="relative flex flex-1">
            <PlatformSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <SegmentNav />
              <main className="flex-1 px-6 pb-16 pt-8 lg:px-10 page-enter">
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>
    </CurrentUserProvider>
  );
}

import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {LanguageToggle} from '@/components/i18n/language-toggle';
import {CurrentUserProvider} from '@/components/auth/can';
import {api, ApiError, type CurrentUser} from '@/lib/api';
import type {ReactNode} from 'react';

/**
 * Fullscreen onboarding shell.
 *
 *   - Replaces the workspace sidebar + top-nav with a slim chrome (logo,
 *     locale toggle, sign-out hint). The whole viewport is the canvas.
 *   - Cookie + `/users/me` checks happen here so unauthenticated users are
 *     redirected to login before any onboarding screen renders.
 *   - Server-only — the actual interactive screens are client components.
 */
export default async function OnboardingLayout({children}: {children: ReactNode}) {
  const cookieStore = await cookies();
  if (!cookieStore.get('synapse_session')) {
    redirect('/login?next=/onboarding/profile');
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
      <div className="relative min-h-screen overflow-hidden bg-zinc-50/60 dark:bg-zinc-950">
        {/* Layered ambient — immersive, no grid, soft glow halos. */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -left-32 top-12 h-[640px] w-[640px] rounded-full bg-brand-500/12 blur-[140px] dark:bg-brand-500/18" />
          <div className="absolute right-[-12rem] top-[28rem] h-[520px] w-[520px] rounded-full bg-violet-500/10 blur-[140px] dark:bg-violet-500/15" />
          <div className="absolute left-[28%] bottom-[-12rem] h-[440px] w-[440px] rounded-full bg-accent-500/10 blur-[140px] dark:bg-accent-500/15" />
          <div className="absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-white/75 to-transparent dark:from-zinc-950/80" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
          {/* Slim chrome — logo + locale only. No nav, no settings, no module switch. */}
          <header className="flex h-16 items-center px-6 lg:px-10">
            <Link href="#" aria-label="Synapse" className="group flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="Synapse"
                width={28}
                height={28}
                className="rounded-md ring-1 ring-black/5 dark:ring-white/10"
                priority
              />
              <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Synapse
              </span>
            </Link>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5">
              <LanguageToggle />
            </div>
          </header>

          {/* Main canvas — children own their layout (asymmetric, fullscreen). */}
          <main className="flex flex-1 flex-col px-6 pb-12 lg:px-10">
            {children}
          </main>
        </div>
      </div>
    </CurrentUserProvider>
  );
}

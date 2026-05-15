'use client';

import {useTheme} from 'next-themes';
import Link from 'next/link';
import {Sun, Moon, Monitor, LogOut, Settings, ChevronDown, Search, Command} from 'lucide-react';
import Image from 'next/image';
import {useState, useEffect} from 'react';
import {cn} from '@/lib/utils';
import {signOut} from '@/lib/auth';
import type {CurrentUser} from '@/lib/api';
import {useTranslator} from '@/components/providers/locale-provider';
import {LanguageToggle} from '@/components/i18n/language-toggle';
import {CommandPalette, useCommandPalette} from '@/components/nav/command-palette';
import {SidebarMobileTrigger} from '@/components/nav/workspace-sidebar';

function ThemeToggle() {
  const {theme, setTheme} = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;

  const icon =
    theme === 'light' ? <Sun size={14} /> :
    theme === 'dark'  ? <Moon size={14} /> :
                        <Monitor size={14} />;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label="Toggle theme"
      >
        {icon}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white/95 shadow-card backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
            {(
              [
                ['light',  <Sun     key="s"  size={13} />, 'Light'],
                ['dark',   <Moon    key="m"  size={13} />, 'Dark'],
                ['system', <Monitor key="mo" size={13} />, 'System'],
              ] as const
            ).map(([t, icon, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTheme(t); setOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors',
                  theme === t
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800',
                )}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UserMenu({user}: {user: CurrentUser | null}) {
  const t = useTranslator();
  const [open, setOpen] = useState(false);

  const initial = (user?.name?.charAt(0) ?? user?.email?.charAt(0) ?? '?').toUpperCase();
  const displayName = user?.name ?? t('appNav.account');
  const displayEmail = user?.email ?? '—';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label="User menu"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-[11px] font-bold text-white shadow-soft">
          {initial}
        </div>
        <ChevronDown size={11} className="text-zinc-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white/95 shadow-card backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{displayName}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{displayEmail}</p>
              {user?.tenant && (
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {user.tenant.name}
                </p>
              )}
            </div>
            <div className="py-1">
              <Link
                href="/workspace/settings"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Settings size={14} className="text-zinc-400" /> {t('common.settings')}
              </Link>
            </div>
            <div className="border-t border-zinc-100 py-1 dark:border-zinc-800">
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut size={14} /> {t('common.signOut')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CommandTrigger({onOpen}: {onOpen: () => void}) {
  const t = useTranslator();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="hidden h-9 items-center gap-2 rounded-lg border border-zinc-200/80 bg-white/60 px-3 text-sm text-zinc-500 shadow-soft transition-all duration-200 ease-snap hover:-translate-y-px hover:bg-white hover:text-zinc-900 hover:shadow-card sm:flex dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
    >
      <Search size={13} />
      <span className="text-xs">{t('common.search')}</span>
      <span className="ml-1 flex items-center gap-0.5 rounded border border-zinc-200 bg-white px-1 py-0.5 text-[10px] font-mono text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
        <Command size={9} />K
      </span>
    </button>
  );
}

export function TopNav({user}: {user: CurrentUser | null}) {
  const palette = useCommandPalette();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/75 backdrop-blur-2xl dark:border-zinc-800/70 dark:bg-zinc-950/75">
        {/* Hairline gradient strip on top — thin "platform" cue. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

        <div className="flex h-14 items-center px-4 lg:px-6">

          {/* Mobile hamburger — opens the sidebar drawer. */}
          <SidebarMobileTrigger className="-ml-1 mr-2" />

          {/* Logo */}
          <Link href="/workspace/overview" className="group mr-3 flex shrink-0 items-center gap-2">
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
          </Link>

          {/* Spacer — primary nav moved to the sidebar. */}
          <div className="flex-1" />

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            <CommandTrigger onOpen={() => palette.setOpen(true)} />
            <LanguageToggle />
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} />
    </>
  );
}

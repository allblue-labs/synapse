'use client';

import {useTheme} from 'next-themes';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Sun, Moon, Monitor, LogOut, Settings, ChevronDown, Search, Command} from 'lucide-react';
import Image from 'next/image';
import {useState, useEffect} from 'react';
import {cn} from '@/lib/utils';

const PRIMARY_NAV = [
  {label: 'Overview', href: '/overview'},
  {label: 'Modules',  href: '/modules'},
  {label: 'Agents',   href: '/agents'},
  {label: 'Activity', href: '/activity'},
] as const;

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

function UserMenu() {
  const [open, setOpen] = useState(false);

  function handleSignOut() {
    document.cookie = 'synapse_token=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label="User menu"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-[11px] font-bold text-white shadow-soft">
          A
        </div>
        <ChevronDown size={11} className="text-zinc-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white/95 shadow-card backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Admin</p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">admin@synapse.ai</p>
            </div>
            <div className="py-1">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Settings size={14} className="text-zinc-400" /> Settings
              </Link>
            </div>
            <div className="border-t border-zinc-100 py-1 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CommandTrigger() {
  return (
    <button
      type="button"
      className="hidden h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white/60 px-3 text-sm text-zinc-500 shadow-soft transition-colors hover:bg-zinc-50 hover:text-zinc-900 sm:flex dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
    >
      <Search size={13} />
      <span className="text-xs">Search</span>
      <span className="ml-1 flex items-center gap-0.5 rounded border border-zinc-200 bg-white px-1 py-0.5 text-[10px] font-mono text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
        <Command size={9} />K
      </span>
    </button>
  );
}

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/85">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-6">

        {/* Logo */}
        <Link href="/overview" className="group mr-6 flex shrink-0 items-center gap-2">
          <Image
            src="/logo.png"
            alt="Synapse"
            width={26}
            height={26}
            className="rounded-md ring-1 ring-black/5 transition-transform group-hover:scale-105 dark:ring-white/10"
            priority
          />
          <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Synapse
          </span>
        </Link>

        {/* Divider */}
        <div className="mr-5 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />

        {/* Primary nav */}
        <nav className="flex flex-1 items-stretch gap-0.5 self-stretch">
          {PRIMARY_NAV.map(({label, href}) => {
            const isActive =
              href === '/overview'
                ? pathname === '/overview'
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex items-center px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
                )}
              >
                {label}
                {isActive && (
                  <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-t-full bg-gradient-to-r from-brand-500 to-accent-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          <CommandTrigger />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

'use client';

import {useTheme} from 'next-themes';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Sun, Moon, Monitor, ChevronDown, LogOut} from 'lucide-react';
import Image from 'next/image';
import {useState} from 'react';
import {cn} from '@/lib/utils';

const NAV_LINKS = [
  {label: 'Overview', href: '/overview'},
  {label: 'Modules', href: '/modules'},
] as const;

function ThemeToggle() {
  const {theme, setTheme} = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <Sun size={16} />
        ) : theme === 'dark' ? (
          <Moon size={16} />
        ) : (
          <Monitor size={16} />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-36 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {(
              [
                ['light', <Sun key="s" size={14} />, 'Light'],
                ['dark', <Moon key="m" size={14} />, 'Dark'],
                ['system', <Monitor key="mo" size={14} />, 'System'],
              ] as const
            ).map(([t, icon, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTheme(t);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-sm',
                  theme === t
                    ? 'text-brand-600 dark:text-brand-400'
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

function LocaleToggle() {
  const [open, setOpen] = useState(false);

  function switchLocale(locale: string) {
    document.cookie = `locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
    window.location.reload();
  }

  const current =
    typeof document !== 'undefined' && document.cookie.includes('locale=pt')
      ? 'PT'
      : 'EN';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        {current} <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-24 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {['EN', 'PT'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  switchLocale(l.toLowerCase());
                  setOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-sm',
                  current === l
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800',
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SignOutButton() {
  function handleSignOut() {
    document.cookie =
      'synapse_token=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut size={16} />
    </button>
  );
}

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
        <Link href="/overview" className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/logo.png"
            alt="Synapse"
            width={28}
            height={28}
            className="rounded-md"
            priority
          />
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Synapse
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({label, href}) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <LocaleToggle />
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

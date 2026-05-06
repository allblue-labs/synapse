'use client';

import {useState, useEffect} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {ArrowRight, Sun, Moon, Monitor, Menu, X} from 'lucide-react';
import {useTheme} from 'next-themes';
import {cn} from '@/lib/utils';

const NAV_LINKS = [
  {label: 'Modules',  href: '#modules'},
  {label: 'Features', href: '#features'},
  {label: 'Pricing',  href: '#pricing'},
  {label: 'Docs',     href: '#'},
] as const;

function ThemeButton() {
  const {theme, setTheme} = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;

  const icon =
    theme === 'light' ? <Sun size={15} /> :
    theme === 'dark'  ? <Moon size={15} /> :
                        <Monitor size={15} />;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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

export function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    fn();
    window.addEventListener('scroll', fn, {passive: true});
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-zinc-200/70 bg-white/80 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/80'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-7xl items-center px-6">

        {/* Logo — prominent */}
        <Link
          href="/"
          className="group mr-10 flex shrink-0 items-center gap-2.5"
        >
          <div className="relative">
            <Image
              src="/logo.png"
              alt="Synapse"
              width={32}
              height={32}
              className="rounded-lg shadow-soft ring-1 ring-black/5 transition-transform group-hover:scale-105 dark:ring-white/10"
              priority
            />
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Synapse
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_LINKS.map(({label, href}) => (
            <a
              key={label}
              href={href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto md:ml-0" />

        {/* Desktop actions */}
        <div className="hidden items-center gap-1.5 md:flex">
          <ThemeButton />
          <Link
            href="/login"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="group inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white shadow-soft transition-all hover:bg-zinc-800 hover:shadow-card dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            Get started
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-zinc-200 bg-white px-6 py-4 md:hidden dark:border-zinc-800 dark:bg-zinc-950">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map(({label, href}) => (
              <a
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {label}
              </a>
            ))}
            <div className="mt-3 grid gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <Link
                href="/login"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-center text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900"
              >
                Get started <ArrowRight size={13} />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Command, Search, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/modules', label: 'Modules' },
  { href: '/agents', label: 'Agents' },
  { href: '/activity', label: 'Activity' },
  { href: '/settings', label: 'Settings' }
];

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bone/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3 text-ink">
          <Image src="/synapse-logo.PNG" alt="Synapse" width={34} height={34} className="h-8 w-8 rounded-md object-cover" priority />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-4">Synapse</p>
            <p className="text-xs leading-4 text-graphite/55">Core Platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition',
                  active ? 'bg-ink text-white' : 'text-graphite/70 hover:bg-ink/5 hover:text-ink'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden h-10 min-w-0 max-w-sm flex-1 items-center gap-3 rounded-md border border-line bg-white/72 px-3 text-sm text-graphite/58 shadow-sm lg:flex">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Search modules, workflows, agents</span>
          <kbd className="ml-auto inline-flex h-6 items-center gap-1 rounded border border-line bg-bone px-2 text-xs">
            <Command className="h-3 w-3" aria-hidden="true" />K
          </kbd>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-10 w-10 px-0" title="Notifications">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="secondary" className="h-10 w-10 px-0" title="User">
            <UserCircle className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">
        {navItems.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium',
                active ? 'bg-ink text-white' : 'text-graphite/70'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

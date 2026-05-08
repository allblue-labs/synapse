'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@/lib/utils';

const NAV: ReadonlyArray<{label: string; href: string}> = [
  {label: 'Overview',     href: '/platform/overview'},
  {label: 'Tenants',      href: '/platform/tenants'},
  {label: 'Modules',      href: '/platform/modules'},
  {label: 'Billing',      href: '/platform/billing'},
  {label: 'Flags',        href: '/platform/flags'},
  {label: 'Integrations', href: '/platform/integrations'},
  {label: 'Runtime',      href: '/platform/runtime'},
  {label: 'Audit',        href: '/platform/audit'},
];

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 items-stretch gap-0.5 self-stretch overflow-x-auto">
      {NAV.map(({label, href}) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'relative flex items-center px-3 text-sm font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
            )}
          >
            {label}
            {isActive && (
              <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-t-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

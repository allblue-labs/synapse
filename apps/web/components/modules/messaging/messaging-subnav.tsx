'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/modules/messaging', label: 'Overview' },
  { href: '/modules/messaging/conversations', label: 'Conversations' },
  { href: '/modules/messaging/leads', label: 'Leads' },
  { href: '/modules/messaging/channels', label: 'Channels' },
  { href: '/modules/messaging/automations', label: 'Automations' }
];

export function MessagingSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line">
      {items.map((item) => {
        const active = item.href === '/modules/messaging' ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition',
              active ? 'border-ink text-ink' : 'border-transparent text-graphite/62 hover:text-ink'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

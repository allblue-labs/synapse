'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Cable, LayoutDashboard, MessageSquareText, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SynapseLogo } from './logo';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/conversations', label: 'Conversations', icon: MessageSquareText },
  { href: '/knowledge', label: 'Knowledge', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-dvh w-72 border-r border-ink/10 bg-white px-4 py-5 lg:block">
      <SynapseLogo />
      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-graphite transition',
                active ? 'bg-ink text-white' : 'hover:bg-ink/5'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 border-t border-ink/10 pt-5">
        <div className="flex items-start gap-3 rounded-md bg-mist px-3 py-3">
          <Cable className="mt-0.5 h-4 w-4 text-signal" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-ink">Telegram ready</p>
            <p className="mt-1 text-xs leading-5 text-graphite/70">First channel adapter is prepared for webhook flow.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

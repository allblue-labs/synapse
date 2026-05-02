'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Cable, Component, LayoutDashboard, MessageSquareText, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SynapseLogo } from './logo';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/modules', label: 'Modules', icon: Component },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/conversations', label: 'Conversations', icon: MessageSquareText },
  { href: '/knowledge', label: 'Knowledge', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-dvh w-72 border-r border-white/10 bg-ink px-4 py-5 text-white lg:block">
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
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition',
                active ? 'bg-white text-ink' : 'text-white/68 hover:bg-white/8 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 border-t border-white/10 pt-5">
        <div className="flex items-start gap-3 rounded-md bg-white/8 px-3 py-3">
          <Cable className="mt-0.5 h-4 w-4 text-signal" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-white">Messaging module</p>
            <p className="mt-1 text-xs leading-5 text-white/58">Registered as the first plug-in capability.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

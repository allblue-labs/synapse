'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState, type ReactNode} from 'react';
import {
  Activity,
  Bot,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Inbox,
  LayoutGrid,
  Plug,
  Settings2,
  ShieldAlert,
  Sparkles,
  Ticket,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import {useCurrentUser} from '@/components/auth/can';
import {hasAnyPermission, type Permission} from '@/lib/permissions';
import {cn} from '@/lib/utils';

/**
 * WorkspaceSidebar — persistent operational rail for the tenant workspace.
 *
 *   - Collapsible (240px ↔ 64px). State is persisted in localStorage so
 *     a refresh doesn't reset the operator's preference.
 *   - Grouped into "Workspace" (cross-module) and "Pulse" (operational).
 *   - Permission-aware: gated items disappear (not just disable) so the
 *     rail stays honest about what the operator can actually reach.
 *   - Active state uses a static left-edge accent bar; animated states
 *     are reserved for Stage 4 (Navigation Architecture).
 */

const STORAGE_KEY = 'synapse.sidebar.collapsed';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Visible only when the user has at least one of these permissions. */
  any?: ReadonlyArray<Permission>;
}

interface NavGroup {
  id: string;
  label: string;
  items: ReadonlyArray<NavItem>;
}

const GROUPS: ReadonlyArray<NavGroup> = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {label: 'Overview', href: '/workspace/overview',  icon: Activity},
      {label: 'Modules',  href: '/workspace/modules',   icon: Boxes},
      {label: 'Agents',   href: '/workspace/agents',    icon: Bot},
      {label: 'Activity', href: '/workspace/activity',  icon: LayoutGrid},
    ],
  },
  {
    id: 'pulse',
    label: 'Pulse',
    items: [
      {label: 'Inbox',         href: '/workspace/modules/pulse/inbox',        icon: Inbox,         any: ['tickets:read']},
      {label: 'Tickets',       href: '/workspace/modules/pulse/tickets',      icon: Ticket,        any: ['tickets:read']},
      {label: 'Timeline',      href: '/workspace/modules/pulse/timeline',     icon: Sparkles,      any: ['tickets:read']},
      {label: 'Playbooks',     href: '/workspace/modules/pulse/playbooks',    icon: Workflow},
      {label: 'Knowledge',     href: '/workspace/modules/pulse/knowledge',    icon: ClipboardList},
      {label: 'Integrations',  href: '/workspace/modules/pulse/integrations', icon: Plug},
      {label: 'Settings',      href: '/workspace/modules/pulse/settings',     icon: Settings2},
    ],
  },
];

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount. Server renders expanded so SSR
  // markup is stable; the client takes over after first paint.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === '1') setCollapsed(true);
    } catch {
      // localStorage may be unavailable (privacy mode). Default applies.
    }
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Ignore — best effort.
      }
      return next;
    });
  }

  return (
    <aside
      data-collapsed={collapsed}
      aria-label="Workspace navigation"
      className={cn(
        'sticky top-14 z-20 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r border-zinc-200/70 bg-white/70 backdrop-blur-xl md:flex dark:border-zinc-800/70 dark:bg-zinc-950/65',
        // No transition until hydrated so SSR doesn't appear to "snap".
        hydrated ? 'transition-[width] duration-200 ease-snap' : '',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {GROUPS.map((group, idx) => {
          const items = group.items.filter((item) => {
            if (!item.any) return true;
            return hasAnyPermission(user, item.any);
          });
          if (items.length === 0) return null;
          return (
            <Section
              key={group.id}
              label={group.label}
              collapsed={collapsed}
              spaced={idx > 0}
            >
              {items.map((item) => (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  collapsed={collapsed}
                  active={isActive(pathname, item.href, item.href === '/workspace/overview')}
                />
              ))}
            </Section>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200/70 px-2 py-2 dark:border-zinc-800/70">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-200"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          <span className="sidebar-label whitespace-nowrap">Collapse</span>
        </button>
      </div>
    </aside>
  );
}

/**
 * PlatformSidebar — same shape, indigo accent. Mounted in the platform
 * admin shell. Distinct items + a quick-link back to the workspace at
 * the bottom so operators don't get stranded in the admin surface.
 */
const PLATFORM_GROUPS: ReadonlyArray<NavGroup> = [
  {
    id: 'platform',
    label: 'Platform',
    items: [
      {label: 'Overview',     href: '/platform/overview',     icon: Activity},
      {label: 'Tenants',      href: '/platform/tenants',      icon: LayoutGrid},
      {label: 'Modules',      href: '/platform/modules',      icon: Boxes},
      {label: 'Billing',      href: '/platform/billing',      icon: Workflow},
      {label: 'Flags',        href: '/platform/flags',        icon: Sparkles},
      {label: 'Integrations', href: '/platform/integrations', icon: Plug},
      {label: 'Runtime',      href: '/platform/runtime',      icon: Bot},
      {label: 'Audit',        href: '/platform/audit',        icon: ShieldAlert},
    ],
  },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === '1') setCollapsed(true);
    } catch {
      // Ignore.
    }
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Ignore.
      }
      return next;
    });
  }

  return (
    <aside
      data-collapsed={collapsed}
      aria-label="Platform navigation"
      className={cn(
        'sticky top-14 z-20 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r border-zinc-200/70 bg-white/70 backdrop-blur-xl md:flex dark:border-zinc-800/70 dark:bg-zinc-950/65',
        hydrated ? 'transition-[width] duration-200 ease-snap' : '',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {PLATFORM_GROUPS.map((group, idx) => (
          <Section key={group.id} label={group.label} collapsed={collapsed} spaced={idx > 0}>
            {group.items.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed}
                active={isActive(pathname, item.href, false)}
                accent="indigo"
              />
            ))}
          </Section>
        ))}

        <Section label="" collapsed={collapsed} spaced>
          <SidebarLink
            href="/workspace/overview"
            icon={ChevronLeft}
            label="Back to workspace"
            collapsed={collapsed}
            active={false}
          />
        </Section>
      </nav>

      <div className="border-t border-zinc-200/70 px-2 py-2 dark:border-zinc-800/70">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-200"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          <span className="sidebar-label whitespace-nowrap">Collapse</span>
        </button>
      </div>
    </aside>
  );
}

// ─── Internal building blocks ───────────────────────────────────────

function Section({label, collapsed, spaced, children}: {label: string; collapsed: boolean; spaced?: boolean; children: ReactNode}) {
  return (
    <div className={cn('px-1', spaced && 'mt-5')}>
      {label && (
        <p
          className={cn(
            'sidebar-label overflow-hidden whitespace-nowrap px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500',
            collapsed && 'pointer-events-none h-0 pb-0 pt-0',
          )}
        >
          {label}
        </p>
      )}
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  collapsed,
  active,
  accent = 'brand',
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  active: boolean;
  accent?: 'brand' | 'indigo';
}) {
  const activeText = accent === 'indigo'
    ? 'text-indigo-700 dark:text-indigo-300'
    : 'text-brand-700 dark:text-brand-300';
  const activeBar = accent === 'indigo'
    ? 'bg-gradient-to-b from-indigo-500 to-violet-500'
    : 'bg-gradient-to-b from-brand-500 to-accent-500';
  const activeBg = accent === 'indigo'
    ? 'bg-indigo-50/80 dark:bg-indigo-900/20'
    : 'bg-brand-50/80 dark:bg-brand-900/20';

  return (
    <li className="relative">
      {active && (
        <span
          aria-hidden="true"
          className={cn('absolute inset-y-1 left-0 w-[3px] rounded-r-full', activeBar)}
        />
      )}
      <Link
        href={href}
        title={collapsed ? label : undefined}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex items-center gap-3 overflow-hidden rounded-lg px-2 py-2 text-[13px] font-medium transition-soft',
          active
            ? `${activeBg} ${activeText}`
            : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-100',
          collapsed && 'justify-center px-0',
        )}
      >
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-soft',
            active
              ? (accent === 'indigo'
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                  : 'bg-brand-500/15 text-brand-700 dark:text-brand-300')
              : 'text-zinc-500 group-hover:text-zinc-800 dark:text-zinc-500 dark:group-hover:text-zinc-200',
          )}
        >
          <Icon size={14} />
        </span>
        <span className="sidebar-label truncate whitespace-nowrap">{label}</span>
      </Link>
    </li>
  );
}

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

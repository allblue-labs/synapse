'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {createPortal} from 'react-dom';
import {
  Activity,
  Bot,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Inbox,
  LayoutGrid,
  Menu,
  Plug,
  Settings2,
  ShieldAlert,
  Sparkles,
  Ticket,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react';
import {useCurrentUser} from '@/components/auth/can';
import {hasAnyPermission, type Permission} from '@/lib/permissions';
import {cn} from '@/lib/utils';

/**
 * Navigation architecture (Stage 4).
 *
 *   - One internal `<SidebarShell>` powers both `WorkspaceSidebar` and
 *     `PlatformSidebar` so collapse, mobile drawer, tooltips and section
 *     collapse are implemented once.
 *   - Desktop: sticky 240↔64-px rail, collapse persisted in localStorage.
 *   - Mobile: hidden by default; a drawer slides in from the left when
 *     `SidebarMobileTrigger` is pressed. Trigger + drawer share state via
 *     `SidebarMobileProvider`, mounted at the layout level.
 *   - Tooltips: when collapsed, hovering an icon shows the label as a
 *     pure-CSS popover anchored to the link's right edge.
 *   - Sub-sections collapse independently via per-section state, also
 *     persisted (Set<sectionId> in localStorage).
 *   - Permission-aware: items with `any: Permission[]` disappear when
 *     the operator doesn't satisfy the gate.
 */

const SIDEBAR_COLLAPSED_KEY = 'synapse.sidebar.collapsed';
const SECTION_COLLAPSED_KEY = 'synapse.sidebar.sections';

// ─── Types ──────────────────────────────────────────────────────────

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
  /** When true, the section ignores collapse state and always renders open. */
  pinned?: boolean;
}

type Accent = 'brand' | 'indigo';

// ─── Mobile context ─────────────────────────────────────────────────

interface MobileSidebarValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SidebarMobileContext = createContext<MobileSidebarValue | null>(null);

export function SidebarMobileProvider({children}: {children: ReactNode}) {
  const [open, setOpen] = useState(false);

  // Close the drawer when the route changes.
  const pathname = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Body scroll lock while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const value = useMemo<MobileSidebarValue>(() => ({open, setOpen}), [open]);

  return (
    <SidebarMobileContext.Provider value={value}>
      {children}
    </SidebarMobileContext.Provider>
  );
}

function useSidebarMobile(): MobileSidebarValue | null {
  return useContext(SidebarMobileContext);
}

/**
 * SidebarMobileTrigger — hamburger button. Renders nothing on `md+` so
 * it never competes with the desktop sidebar.
 */
export function SidebarMobileTrigger({className}: {className?: string}) {
  const ctx = useSidebarMobile();
  if (!ctx) return null;
  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(true)}
      aria-label="Open navigation"
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-100',
        className,
      )}
    >
      <Menu size={16} />
    </button>
  );
}

// ─── Workspace + Platform configs ──────────────────────────────────

const WORKSPACE_GROUPS: ReadonlyArray<NavGroup> = [
  {
    id: 'workspace',
    label: 'Workspace',
    pinned: true,
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
      {label: 'Inbox',        href: '/workspace/modules/pulse/inbox',        icon: Inbox,         any: ['tickets:read']},
      {label: 'Tickets',      href: '/workspace/modules/pulse/tickets',      icon: Ticket,        any: ['tickets:read']},
      {label: 'Timeline',     href: '/workspace/modules/pulse/timeline',     icon: Sparkles,      any: ['tickets:read']},
      {label: 'Playbooks',    href: '/workspace/modules/pulse/playbooks',    icon: Workflow},
      {label: 'Knowledge',    href: '/workspace/modules/pulse/knowledge',    icon: ClipboardList},
      {label: 'Integrations', href: '/workspace/modules/pulse/integrations', icon: Plug},
      {label: 'Settings',     href: '/workspace/modules/pulse/settings',     icon: Settings2},
    ],
  },
];

const PLATFORM_GROUPS: ReadonlyArray<NavGroup> = [
  {
    id: 'platform',
    label: 'Platform',
    pinned: true,
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

// ─── Public exports ─────────────────────────────────────────────────

export function WorkspaceSidebar() {
  return <SidebarShell groups={WORKSPACE_GROUPS} accent="brand" />;
}

export function PlatformSidebar() {
  return (
    <SidebarShell
      groups={PLATFORM_GROUPS}
      accent="indigo"
      footerExtra={
        <SidebarLink
          href="/workspace/overview"
          icon={ChevronLeft}
          label="Back to workspace"
          collapsed={false}
          active={false}
        />
      }
    />
  );
}

// ─── SidebarShell (shared core) ─────────────────────────────────────

interface SidebarShellProps {
  groups: ReadonlyArray<NavGroup>;
  accent: Accent;
  footerExtra?: ReactNode;
}

function SidebarShell({groups, accent, footerExtra}: SidebarShellProps) {
  const pathname = usePathname();
  const user = useCurrentUser();
  const mobile = useSidebarMobile();

  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [closedSections, setClosedSections] = useState<ReadonlySet<string>>(new Set());

  // Hydrate persisted state on mount.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1') setCollapsed(true);
      const raw = window.localStorage.getItem(SECTION_COLLAPSED_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setClosedSections(new Set(parsed.filter((v): v is string => typeof v === 'string')));
      }
    } catch {
      // localStorage may be unavailable (privacy mode). Defaults apply.
    }
    setHydrated(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // Best effort.
      }
      return next;
    });
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setClosedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      try {
        window.localStorage.setItem(SECTION_COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {
        // Best effort.
      }
      return next;
    });
  }, []);

  // Filter items by permission once per render.
  const renderedGroups = useMemo(() => {
    return groups
      .map((group) => ({
        ...group,
        visibleItems: group.items.filter((item) => !item.any || hasAnyPermission(user, item.any)),
      }))
      .filter((group) => group.visibleItems.length > 0);
  }, [groups, user]);

  return (
    <>
      <DesktopSidebar
        groups={renderedGroups}
        accent={accent}
        pathname={pathname}
        collapsed={collapsed}
        hydrated={hydrated}
        toggleCollapsed={toggleCollapsed}
        closedSections={closedSections}
        toggleSection={toggleSection}
        footerExtra={footerExtra}
      />
      <MobileDrawer
        open={mobile?.open ?? false}
        onClose={() => mobile?.setOpen(false)}
        groups={renderedGroups}
        accent={accent}
        pathname={pathname}
        closedSections={closedSections}
        toggleSection={toggleSection}
        footerExtra={footerExtra}
      />
    </>
  );
}

// ─── Desktop sidebar (sticky, collapsible) ──────────────────────────

interface DesktopProps {
  groups: ReadonlyArray<NavGroup & {visibleItems: ReadonlyArray<NavItem>}>;
  accent: Accent;
  pathname: string;
  collapsed: boolean;
  hydrated: boolean;
  toggleCollapsed: () => void;
  closedSections: ReadonlySet<string>;
  toggleSection: (id: string) => void;
  footerExtra?: ReactNode;
}

function DesktopSidebar({
  groups,
  accent,
  pathname,
  collapsed,
  hydrated,
  toggleCollapsed,
  closedSections,
  toggleSection,
  footerExtra,
}: DesktopProps) {
  return (
    <aside
      data-collapsed={collapsed}
      aria-label="Primary navigation"
      className={cn(
        'sticky top-14 z-20 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r border-zinc-200/55 bg-white/65 backdrop-blur-xl md:flex dark:border-zinc-800/55 dark:bg-zinc-950/55',
        // No width transition until hydrated so SSR doesn't appear to "snap".
        hydrated ? 'transition-[width] duration-200 ease-snap' : '',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {groups.map((group, idx) => (
          <Section
            key={group.id}
            group={group}
            spaced={idx > 0}
            collapsed={collapsed}
            closed={!group.pinned && closedSections.has(group.id)}
            onToggle={group.pinned ? undefined : () => toggleSection(group.id)}
            accent={accent}
            pathname={pathname}
          />
        ))}
        {footerExtra && (
          <div className="mt-5 px-1">
            <ul className="space-y-0.5">{footerExtra}</ul>
          </div>
        )}
      </nav>

      <div className="border-t border-zinc-200/55 px-2 py-2 dark:border-zinc-800/55">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-[11px] font-medium text-zinc-500 transition-soft hover:bg-zinc-100/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-200"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          <span className="sidebar-label whitespace-nowrap">Collapse</span>
        </button>
      </div>
    </aside>
  );
}

// ─── Mobile drawer ──────────────────────────────────────────────────

interface MobileProps {
  open: boolean;
  onClose: () => void;
  groups: ReadonlyArray<NavGroup & {visibleItems: ReadonlyArray<NavItem>}>;
  accent: Accent;
  pathname: string;
  closedSections: ReadonlySet<string>;
  toggleSection: (id: string) => void;
  footerExtra?: ReactNode;
}

function MobileDrawer({
  open,
  onClose,
  groups,
  accent,
  pathname,
  closedSections,
  toggleSection,
  footerExtra,
}: MobileProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] md:hidden">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-zinc-950/50 backdrop-blur-sm animate-fade-in-fast"
      />

      {/* Drawer panel */}
      <aside
        aria-label="Primary navigation"
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-zinc-200/55 bg-white shadow-elevated animate-slide-in-left dark:border-zinc-800/55 dark:bg-zinc-950"
      >
        <header className="flex h-14 items-center justify-between border-b border-zinc-200/55 px-4 dark:border-zinc-800/55">
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Navigate
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-100"
          >
            <X size={15} />
          </button>
        </header>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {groups.map((group, idx) => (
            <Section
              key={group.id}
              group={group}
              spaced={idx > 0}
              collapsed={false}
              closed={!group.pinned && closedSections.has(group.id)}
              onToggle={group.pinned ? undefined : () => toggleSection(group.id)}
              accent={accent}
              pathname={pathname}
            />
          ))}
          {footerExtra && (
            <div className="mt-5 px-1">
              <ul className="space-y-0.5">{footerExtra}</ul>
            </div>
          )}
        </nav>
      </aside>
    </div>,
    document.body,
  );
}

// ─── Section (collapsible group) ────────────────────────────────────

interface SectionProps {
  group: NavGroup & {visibleItems: ReadonlyArray<NavItem>};
  spaced: boolean;
  collapsed: boolean;
  closed: boolean;
  onToggle?: () => void;
  accent: Accent;
  pathname: string;
}

function Section({group, spaced, collapsed, closed, onToggle, accent, pathname}: SectionProps) {
  const headerLabel = group.label;
  const isToggleable = !group.pinned && onToggle !== undefined;

  return (
    <div className={cn('px-1', spaced && 'mt-5')}>
      {headerLabel && (
        isToggleable ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!closed}
            className={cn(
              'sidebar-label flex w-full items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md px-2 pb-1.5 pt-1 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 transition-soft hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200',
              collapsed && 'pointer-events-none h-0 pb-0 pt-0',
            )}
          >
            <ChevronDown
              size={10}
              className={cn(
                'shrink-0 transition-transform duration-200 ease-snap',
                closed && '-rotate-90',
              )}
            />
            <span className="flex-1 truncate">{headerLabel}</span>
          </button>
        ) : (
          <p
            className={cn(
              'sidebar-label overflow-hidden whitespace-nowrap px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500',
              collapsed && 'pointer-events-none h-0 pb-0 pt-0',
            )}
          >
            {headerLabel}
          </p>
        )
      )}

      <ul
        className={cn(
          'space-y-0.5 overflow-hidden transition-[max-height,opacity] duration-200 ease-snap',
          // When closed: collapse the section. When collapsed sidebar, ignore
          // the closed state — icons should still show in icon-only mode.
          !collapsed && closed
            ? 'max-h-0 opacity-0'
            : 'max-h-[40rem] opacity-100',
        )}
      >
        {group.visibleItems.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            active={isActive(pathname, item.href, isOverviewHref(item.href))}
            accent={accent}
          />
        ))}
      </ul>
    </div>
  );
}

// ─── SidebarLink ────────────────────────────────────────────────────

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  active: boolean;
  accent?: Accent;
}

function SidebarLink({href, icon: Icon, label, collapsed, active, accent = 'brand'}: SidebarLinkProps) {
  const activeText = accent === 'indigo'
    ? 'text-indigo-700 dark:text-indigo-300'
    : 'text-brand-700 dark:text-brand-300';
  const activeBar = accent === 'indigo'
    ? 'bg-gradient-to-b from-indigo-500 to-violet-500'
    : 'bg-gradient-to-b from-brand-500 to-accent-500';
  const activeBg = accent === 'indigo'
    ? 'bg-indigo-50/70 dark:bg-indigo-900/20'
    : 'bg-brand-50/70 dark:bg-brand-900/20';
  const activeIconBg = accent === 'indigo'
    ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
    : 'bg-brand-500/15 text-brand-700 dark:text-brand-300';

  return (
    <li className="relative">
      {/* Animated active indicator: a left-edge bar that scales in. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-1 left-0 w-[3px] origin-top scale-y-0 rounded-r-full transition-transform duration-200 ease-snap',
          activeBar,
          active && 'scale-y-100',
        )}
      />
      <Link
        href={href}
        data-tooltip={collapsed ? label : undefined}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'sidebar-link group relative flex items-center gap-3 overflow-visible rounded-lg px-2 py-2 text-[13px] font-medium transition-soft',
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
              ? activeIconBg
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

// ─── Helpers ───────────────────────────────────────────────────────

function isOverviewHref(href: string): boolean {
  return href === '/workspace/overview' || href === '/platform/overview';
}

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

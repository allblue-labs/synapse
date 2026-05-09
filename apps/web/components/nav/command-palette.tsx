'use client';

import {createPortal} from 'react-dom';
import {useRouter} from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Activity,
  ArrowRight,
  Bot,
  Boxes,
  Building2,
  ClipboardList,
  Command as CommandIcon,
  CreditCard,
  Flag,
  Inbox,
  Layers,
  LifeBuoy,
  Plug,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  Ticket,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import {useCurrentUser} from '@/components/auth/can';
import {hasAnyPermission, hasPermission, type Permission} from '@/lib/permissions';
import {cn} from '@/lib/utils';

/**
 * CommandPalette — global ⌘K command surface.
 *
 *   - Single keyboard shortcut (⌘K / Ctrl+K) opens the palette anywhere.
 *   - Lists are *permission-aware* — items with a `permission` or `any`
 *     gate are filtered before render so users never see actions they
 *     can't take.
 *   - Pure navigation today; it's structured so action-style commands
 *     (e.g. "Open new ticket") can be added later by extending the
 *     `command` shape with an `onRun` handler.
 */

interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  group: 'jump' | 'pulse' | 'platform' | 'help';
  icon: LucideIcon;
  href: string;
  permission?: Permission;
  any?: ReadonlyArray<Permission>;
  /** Optional keywords to widen fuzzy matching. */
  keywords?: ReadonlyArray<string>;
}

const COMMANDS: ReadonlyArray<PaletteCommand> = [
  // Jump-to surfaces
  {id: 'jump-overview',  group: 'jump',     label: 'Workspace overview',   hint: 'Operational dashboard', icon: Activity,    href: '/workspace/overview'},
  {id: 'jump-modules',   group: 'jump',     label: 'Module store',         hint: 'Discover and install',  icon: Layers,      href: '/workspace/modules', keywords: ['marketplace','catalog']},
  {id: 'jump-agents',    group: 'jump',     label: 'Agents',               hint: 'AI orchestration',      icon: Bot,         href: '/workspace/agents'},
  {id: 'jump-activity',  group: 'jump',     label: 'Activity',             hint: 'Tenant-wide log',       icon: Terminal,    href: '/workspace/activity'},

  // Pulse
  {id: 'pulse-inbox',     group: 'pulse',   label: 'Pulse · Inbox',         hint: 'Operator queue',                  icon: Inbox,         href: '/workspace/modules/pulse/inbox',          permission: 'tickets:read', keywords: ['queue','review']},
  {id: 'pulse-tickets',   group: 'pulse',   label: 'Pulse · Tickets',       hint: 'Lifecycle search',                icon: Ticket,        href: '/workspace/modules/pulse/tickets',        permission: 'tickets:read'},
  {id: 'pulse-timeline',  group: 'pulse',   label: 'Pulse · Timeline',      hint: 'Event feed',                      icon: Activity,      href: '/workspace/modules/pulse/timeline',       permission: 'tickets:read'},
  {id: 'pulse-playbooks', group: 'pulse',   label: 'Pulse · Playbooks',     hint: 'Guided flows',                    icon: Workflow,      href: '/workspace/modules/pulse/playbooks'},
  {id: 'pulse-knowledge', group: 'pulse',   label: 'Pulse · Knowledge',     hint: 'Context contexts',                icon: ClipboardList, href: '/workspace/modules/pulse/knowledge'},
  {id: 'pulse-integ',     group: 'pulse',   label: 'Pulse · Integrations',  hint: 'Channels and providers',          icon: Plug,          href: '/workspace/modules/pulse/integrations'},
  {id: 'pulse-metrics',   group: 'pulse',   label: 'Pulse · Metrics',       hint: 'Performance and usage',           icon: Sparkles,      href: '/workspace/modules/pulse/metrics'},

  // Platform admin (visible only with platform perms)
  {id: 'plat-overview',  group: 'platform', label: 'Platform · Overview',   hint: 'Health + tenants',           icon: ShieldAlert,    href: '/platform/overview',     any: ['platform:metrics:read','platform:users:read']},
  {id: 'plat-tenants',   group: 'platform', label: 'Platform · Tenants',    hint: 'Multi-tenant directory',     icon: Building2,      href: '/platform/tenants',      any: ['platform:users:read']},
  {id: 'plat-modules',   group: 'platform', label: 'Platform · Modules',    hint: 'Catalog and rollout',        icon: Boxes,          href: '/platform/modules',      any: ['platform:modules:manage']},
  {id: 'plat-billing',   group: 'platform', label: 'Platform · Billing',    hint: 'Revenue + subscriptions',    icon: CreditCard,     href: '/platform/billing',      any: ['platform:metrics:read','billing:read']},
  {id: 'plat-flags',     group: 'platform', label: 'Platform · Flags',      hint: 'Feature flags',              icon: Flag,           href: '/platform/flags',        any: ['platform:policies:manage']},
  {id: 'plat-runtime',   group: 'platform', label: 'Platform · Runtime',    hint: 'Workers + queues',           icon: Activity,       href: '/platform/runtime',      any: ['platform:metrics:read','runtime:executions:read']},
  {id: 'plat-audit',     group: 'platform', label: 'Platform · Audit',      hint: 'Security ledger',            icon: ShieldAlert,    href: '/platform/audit',        any: ['audit:read']},

  // Help / shortcuts
  {id: 'help-shortcuts', group: 'help', label: 'Keyboard shortcuts',  hint: 'View all', icon: CommandIcon, href: '#shortcuts'},
  {id: 'help-support',   group: 'help', label: 'Contact support',     hint: 'Open ticket', icon: LifeBuoy, href: 'mailto:support@allbluelabs.com'},
];

const GROUP_LABELS: Record<PaletteCommand['group'], string> = {
  jump:     'Jump to',
  pulse:    'Pulse',
  platform: 'Platform',
  help:     'Help',
};

function score(needle: string, hay: string): number {
  if (!needle) return 1;
  const n = needle.toLowerCase();
  const h = hay.toLowerCase();
  if (h.includes(n)) return 2 - h.indexOf(n) / Math.max(h.length, 1);
  // Loose subsequence match — every character in order, with gaps.
  let i = 0;
  for (const c of h) {
    if (c === n[i]) i++;
    if (i === n.length) return 0.6;
  }
  return 0;
}

export function CommandPalette({open, onClose}: {open: boolean; onClose: () => void}) {
  const router = useRouter();
  const user = useCurrentUser();
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Permission-filtered + ranked list.
  const ranked = useMemo(() => {
    const allowed = COMMANDS.filter((c) => {
      if (c.permission && !hasPermission(user, c.permission)) return false;
      if (c.any && !hasAnyPermission(user, c.any)) return false;
      return true;
    });
    if (!q.trim()) return allowed;
    return allowed
      .map((c) => {
        const labelScore = score(q, c.label);
        const hintScore  = c.hint ? score(q, c.hint) * 0.6 : 0;
        const kwScore    = c.keywords?.reduce((s, k) => Math.max(s, score(q, k)), 0) ?? 0;
        return {c, s: Math.max(labelScore, hintScore, kwScore)};
      })
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.c);
  }, [q, user]);

  // Group by category preserving order.
  const grouped = useMemo(() => {
    const buckets = new Map<PaletteCommand['group'], PaletteCommand[]>();
    for (const c of ranked) {
      const arr = buckets.get(c.group) ?? [];
      arr.push(c);
      buckets.set(c.group, arr);
    }
    return Array.from(buckets.entries());
  }, [ranked]);

  const flat = ranked;

  // Reset state when reopening.
  useEffect(() => {
    if (open) {
      setQ('');
      setActiveIdx(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open]);

  // Keep highlighted item in view as the user navigates.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-idx="${activeIdx}"]`);
    el?.scrollIntoView({block: 'nearest'});
  }, [activeIdx, open]);

  // Body scroll lock + key handlers.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const runCommand = useCallback(
    (cmd: PaletteCommand) => {
      onClose();
      if (cmd.href.startsWith('#') || cmd.href.startsWith('mailto:')) {
        if (cmd.href.startsWith('mailto:')) window.location.href = cmd.href;
        return;
      }
      router.push(cmd.href);
    },
    [onClose, router],
  );

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = flat[activeIdx];
        if (cmd) runCommand(cmd);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [activeIdx, flat, onClose, runCommand],
  );

  if (typeof window === 'undefined' || !open) return null;

  let cursor = -1;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh] sm:pt-[18vh]" onKeyDown={onKey}>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close command palette"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-zinc-950/40 backdrop-blur-md animate-fade-in-fast dark:bg-zinc-950/65"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/95 shadow-elevated backdrop-blur-2xl animate-panel-in
                   dark:border-zinc-800/70 dark:bg-zinc-950/90"
      >
        {/* Search */}
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-900">
          <Search size={15} className="shrink-0 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setActiveIdx(0); }}
            placeholder="Jump to anything…"
            className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-100"
          />
          <span className="kbd">esc</span>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {flat.length === 0 && (
            <p className="px-4 py-10 text-center text-xs text-zinc-500 dark:text-zinc-500">
              No matches. Try a different keyword.
            </p>
          )}

          {grouped.map(([group, items]) => (
            <Group key={group} label={GROUP_LABELS[group]}>
              {items.map((cmd) => {
                cursor += 1;
                const isActive = cursor === activeIdx;
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    data-cmd-idx={cursor}
                    onMouseEnter={() => setActiveIdx(cursor)}
                    onClick={() => runCommand(cmd)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 ease-snap',
                      isActive
                        ? 'bg-brand-50/80 text-zinc-900 dark:bg-brand-900/25 dark:text-zinc-100'
                        : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/60',
                    )}
                  >
                    <span className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                      isActive
                        ? 'bg-brand-500/15 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400',
                    )}>
                      <Icon size={14} />
                    </span>
                    <span className="flex-1 truncate">
                      <span className="block text-sm font-medium">{cmd.label}</span>
                      {cmd.hint && (
                        <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-500">{cmd.hint}</span>
                      )}
                    </span>
                    <ArrowRight
                      size={13}
                      className={cn(
                        'shrink-0 transition-all duration-200 ease-snap',
                        isActive ? 'translate-x-0.5 text-brand-600 dark:text-brand-400' : 'text-transparent',
                      )}
                    />
                  </button>
                );
              })}
            </Group>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-500 dark:border-zinc-900 dark:text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5"><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
            <span className="inline-flex items-center gap-1.5"><span className="kbd">↵</span> open</span>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <CommandIcon size={10} /> Synapse · {flat.length} {flat.length === 1 ? 'result' : 'results'}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Group({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="px-1.5 pb-1.5">
      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

/**
 * useCommandPalette — small hook that owns open/close state and binds
 * the global ⌘K shortcut. Returned `bind` should be spread to the
 * trigger button so it stays in sync.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      if (cmdKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === '/' && !isInputFocused()) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return {open, setOpen};
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

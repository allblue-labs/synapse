'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, Search} from 'lucide-react';
import {Sheet, SheetBody, SheetFooter, SheetSection} from '@/components/ui/sheet';
import {StatusPill, type StatusTone} from '@/components/ui/status-pill';
import {InlineAction} from '@/components/ui/inline-action';
import {AnimatedNumber} from '@/components/ui/animated-number';
import {ConfidenceMeter} from '@/components/pulse/confidence-meter';
import {ChannelPill} from '@/components/pulse/status-pills';
import type {PulseTicketRow} from '@/lib/pulse/types';
import {cn} from '@/lib/utils';

/**
 * TicketsBoard — operational table for the Pulse ticket directory.
 *
 *   - Owns toolbar state (search + status filter chips + priority chips).
 *   - Detail Sheet opens on row click; the operator stays on the list
 *     while inspecting and only navigates when they're ready to act.
 *   - Inline `Inspect` + `Open` actions per row; no destructive
 *     mutations from the list (those land in the ticket detail page,
 *     where the existing `TicketActionBar` already owns them).
 */

interface TicketsBoardProps {
  rows: ReadonlyArray<PulseTicketRow>;
  total: number;
}

type StatusFilter = 'ALL' | PulseTicketRow['status'];
type PriorityFilter = 'ALL' | PulseTicketRow['priority'];

const STATUS_FILTERS: ReadonlyArray<{value: StatusFilter; label: string}> = [
  {value: 'ALL',              label: 'All'},
  {value: 'PENDING_REVIEW',   label: 'Needs review'},
  {value: 'OPEN',             label: 'Open'},
  {value: 'WAITING_CUSTOMER', label: 'Waiting'},
  {value: 'RESOLVED',         label: 'Resolved'},
  {value: 'CANCELLED',        label: 'Cancelled'},
];

const PRIORITY_FILTERS: ReadonlyArray<{value: PriorityFilter; label: string}> = [
  {value: 'ALL',    label: 'Any'},
  {value: 'URGENT', label: 'Urgent'},
  {value: 'HIGH',   label: 'High'},
  {value: 'NORMAL', label: 'Normal'},
  {value: 'LOW',    label: 'Low'},
];

const STATUS_META: Record<PulseTicketRow['status'], {label: string; tone: StatusTone; pulse: boolean}> = {
  OPEN:             {label: 'Open',         tone: 'sky',     pulse: true},
  PENDING_REVIEW:   {label: 'Needs review', tone: 'amber',   pulse: true},
  WAITING_CUSTOMER: {label: 'Waiting',      tone: 'zinc',    pulse: false},
  RESOLVED:         {label: 'Resolved',     tone: 'emerald', pulse: false},
  CANCELLED:        {label: 'Cancelled',    tone: 'red',     pulse: false},
};

const PRIORITY_META: Record<PulseTicketRow['priority'], {label: string; tone: StatusTone}> = {
  URGENT: {label: 'Urgent', tone: 'red'},
  HIGH:   {label: 'High',   tone: 'amber'},
  NORMAL: {label: 'Normal', tone: 'sky'},
  LOW:    {label: 'Low',    tone: 'zinc'},
};

function ageOf(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1)  return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// ─── Component ───────────────────────────────────────────────────────

export function TicketsBoard({rows, total}: TicketsBoardProps) {
  const [query, setQuery]       = useState('');
  const [status, setStatus]     = useState<StatusFilter>('ALL');
  const [priority, setPriority] = useState<PriorityFilter>('ALL');
  const [selected, setSelected] = useState<PulseTicketRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status   !== 'ALL' && r.status   !== status)   return false;
      if (priority !== 'ALL' && r.priority !== priority) return false;
      if (!q) return true;
      const name = (r.customer.displayName ?? r.customer.handle).toLowerCase();
      return (
        name.includes(q)
        || r.id.toLowerCase().includes(q)
        || (r.preview ?? '').toLowerCase().includes(q)
        || r.customer.handle.toLowerCase().includes(q)
      );
    });
  }, [rows, query, status, priority]);

  // Stat strip — operator-friendly counters that respect the active filter.
  const counters = useMemo(() => ({
    needsReview: filtered.filter((t) => t.status === 'PENDING_REVIEW').length,
    open:        filtered.filter((t) => t.status === 'OPEN' || t.status === 'WAITING_CUSTOMER').length,
    closed:      filtered.filter((t) => t.status === 'RESOLVED' || t.status === 'CANCELLED').length,
  }), [filtered]);

  const scored = filtered.filter((t) => t.confidence !== null);
  const avgConfidence = scored.length > 0
    ? Math.round((scored.reduce((s, t) => s + (t.confidence ?? 0), 0) / scored.length) * 100)
    : null;

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Needs review"    value={counters.needsReview} tone="amber"   pulse={counters.needsReview > 0} />
        <Stat label="Open"            value={counters.open}        tone="sky" />
        <Stat label="Closed"          value={counters.closed}      tone="emerald" />
        <Stat label="Avg confidence"  value={avgConfidence != null ? `${avgConfidence}%` : '—'} tone="zinc" />
      </section>

      <section className="surface-translucent relative overflow-hidden">
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          status={status}
          onStatusChange={setStatus}
          priority={priority}
          onPriorityChange={setPriority}
          shown={filtered.length}
          total={total}
        />

        <Table
          rows={filtered}
          onSelect={setSelected}
          selectedId={selected?.id ?? null}
        />

        <p className="border-t border-zinc-200/55 px-6 py-3 text-[11px] text-zinc-500 dark:border-zinc-800/55 dark:text-zinc-500">
          Rows are seeded by <span className="font-mono">GET /v1/pulse/tickets</span>; lifecycle actions live on the ticket detail page.
        </p>
      </section>

      <DetailSheet row={selected} onClose={() => setSelected(null)} />
    </>
  );
}

// ─── Stat ────────────────────────────────────────────────────────────

const STAT_TONE: Record<'amber' | 'sky' | 'emerald' | 'zinc', {text: string; bg: string}> = {
  amber:   {text: 'text-amber-700 dark:text-amber-400',     bg: 'from-amber-500/15 to-amber-500/0'},
  sky:     {text: 'text-sky-700 dark:text-sky-300',         bg: 'from-sky-500/15 to-sky-500/0'},
  emerald: {text: 'text-emerald-700 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/0'},
  zinc:    {text: 'text-zinc-800 dark:text-zinc-200',       bg: 'from-zinc-500/10 to-zinc-500/0'},
};

function Stat({label, value, tone, pulse}: {label: string; value: number | string; tone: keyof typeof STAT_TONE; pulse?: boolean}) {
  const t = STAT_TONE[tone];
  return (
    <div className="surface-dock relative overflow-hidden p-4">
      {pulse && <div aria-hidden="true" className="pointer-events-none absolute inset-0 stripes-pulse opacity-25" />}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b ${t.bg} opacity-70`} />
      <div className="relative flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{label}</span>
        {pulse && typeof value === 'number' && value > 0 && <span className="live-dot" aria-hidden="true" />}
      </div>
      <p className={`relative mt-2 text-2xl font-bold tabular-nums tracking-tight ${t.text}`}>
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </p>
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────

function Toolbar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  shown,
  total,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  status: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
  priority: PriorityFilter;
  onPriorityChange: (p: PriorityFilter) => void;
  shown: number;
  total: number;
}) {
  return (
    <div className="space-y-3 border-b border-zinc-200/55 px-6 py-4 dark:border-zinc-800/55">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-200/55 bg-white/65 px-3 py-1.5 shadow-soft backdrop-blur dark:border-zinc-800/55 dark:bg-zinc-900/55">
          <Search size={13} className="text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search customer, preview, id…"
            className="w-56 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              clear
            </button>
          )}
        </div>

        <FilterChips
          label="Status"
          options={STATUS_FILTERS}
          value={status}
          onChange={onStatusChange}
          accent="brand"
        />

        <span className="ml-auto text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-500">
          {shown} / {total}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterChips
          label="Priority"
          options={PRIORITY_FILTERS}
          value={priority}
          onChange={onPriorityChange}
          accent="amber"
        />
      </div>
    </div>
  );
}

function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
  accent,
}: {
  label: string;
  options: ReadonlyArray<{value: T; label: string}>;
  value: T;
  onChange: (v: T) => void;
  accent: 'brand' | 'amber';
}) {
  const activeCls = accent === 'amber'
    ? 'border-amber-200/70 bg-amber-50/70 text-amber-700 dark:border-amber-800/55 dark:bg-amber-900/25 dark:text-amber-300'
    : 'border-brand-200/70 bg-brand-50/70 text-brand-700 dark:border-brand-800/55 dark:bg-brand-900/25 dark:text-brand-300';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">{label}</span>
      {options.map(({value: v, label: l}) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-soft',
              active
                ? activeCls
                : 'border-zinc-200/55 bg-white/55 text-zinc-600 hover:bg-white dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:text-zinc-400 dark:hover:bg-zinc-900',
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────

function Table({
  rows,
  onSelect,
  selectedId,
}: {
  rows: ReadonlyArray<PulseTicketRow>;
  onSelect: (row: PulseTicketRow) => void;
  selectedId: string | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="m-6 rounded-xl border border-dashed border-zinc-200/55 bg-white/40 p-10 text-center text-xs text-zinc-500 dark:border-zinc-800/55 dark:bg-zinc-900/30 dark:text-zinc-500">
        No tickets match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">
            <th className="px-6 py-2 font-semibold">Customer</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Priority</th>
            <th className="px-3 py-2 font-semibold">Skill</th>
            <th className="px-3 py-2 font-semibold">Channel</th>
            <th className="px-3 py-2 font-semibold">Confidence</th>
            <th className="px-3 py-2 font-semibold">Age</th>
            <th className="px-6 py-2 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200/55 dark:divide-zinc-800/55">
          {rows.map((row) => {
            const status = STATUS_META[row.status];
            const priority = PRIORITY_META[row.priority];
            const isSelected = selectedId === row.id;
            return (
              <tr
                key={row.id}
                onClick={() => onSelect(row)}
                data-selected={isSelected ? 'true' : 'false'}
                className={cn(
                  'group cursor-pointer transition-soft',
                  isSelected
                    ? 'bg-brand-50/40 dark:bg-brand-900/15'
                    : 'hover:bg-white/40 dark:hover:bg-zinc-900/40',
                )}
              >
                <td className="px-6 py-3 align-middle">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/15 to-accent-500/15 text-[11px] font-bold text-brand-700 ring-1 ring-brand-200/55 dark:text-brand-300 dark:ring-brand-800/55">
                      {(row.customer.displayName ?? row.customer.handle).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="t-h3 leading-tight">
                        {row.customer.displayName ?? row.customer.handle}
                      </p>
                      <p className="t-meta-xs truncate">
                        {row.preview || `${row.customer.handle} · ${row.id.slice(0, 8)}`}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 align-middle">
                  <StatusPill tone={status.tone} label={status.label} pulse={status.pulse} />
                </td>
                <td className="px-3 py-3 align-middle">
                  <StatusPill tone={priority.tone} label={priority.label} pulse={row.priority === 'URGENT'} />
                </td>
                <td className="px-3 py-3 align-middle">
                  <span className="t-meta">{row.skill?.toString().toLowerCase().replace('_', ' ') ?? row.type.toLowerCase().replace('_', ' ')}</span>
                </td>
                <td className="px-3 py-3 align-middle">
                  <ChannelPill channel={row.customer.channel} />
                </td>
                <td className="px-3 py-3 align-middle">
                  <ConfidenceMeter value={row.confidence} variant="inline" />
                </td>
                <td className="px-3 py-3 align-middle">
                  <span className="t-meta-xs">{ageOf(row.updatedAt)}</span>
                </td>
                <td className="px-6 py-3 text-right align-middle">
                  <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <InlineAction
                      tone="neutral"
                      icon={<ArrowUpRight size={11} />}
                      onClick={() => onSelect(row)}
                    >
                      Inspect
                    </InlineAction>
                    <Link
                      href={`/workspace/modules/pulse/tickets/${row.id}`}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-brand-200/70 bg-brand-50/70 px-2 text-[11px] font-semibold text-brand-700 shadow-soft transition-soft hover:bg-brand-50 active:scale-[0.97] dark:border-brand-800/55 dark:bg-brand-900/25 dark:text-brand-300 dark:hover:bg-brand-900/40"
                    >
                      Open
                      <ArrowUpRight size={11} />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Detail Sheet ────────────────────────────────────────────────────

function DetailSheet({row, onClose}: {row: PulseTicketRow | null; onClose: () => void}) {
  const open = row !== null;
  if (!row) {
    return <Sheet open={open} onClose={onClose} title="Ticket detail" width="lg">{null}</Sheet>;
  }

  const status = STATUS_META[row.status];
  const priority = PRIORITY_META[row.priority];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={row.customer.displayName ?? row.customer.handle}
      description={`${row.customer.handle} · ${row.id}`}
      width="lg"
    >
      <SheetBody>
        <div className="flex flex-wrap items-center gap-2 pb-4">
          <StatusPill tone={status.tone} label={status.label} pulse={status.pulse} size="md" />
          <StatusPill tone={priority.tone} label={`Priority · ${priority.label}`} pulse={row.priority === 'URGENT'} size="md" />
          {row.escalated && <StatusPill tone="red" label="Escalated" pulse size="md" />}
          <span className="t-meta-xs ml-auto">{ageOf(row.updatedAt)}</span>
        </div>

        {row.preview && (
          <SheetSection eyebrow="Preview" title="What we know">
            <p className="t-body">{row.preview}</p>
          </SheetSection>
        )}

        <SheetSection eyebrow="Classification" title="Skill, type, channel">
          <div className="divide-y divide-zinc-200/55 dark:divide-zinc-800/55">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">Skill</span>
              <span className="t-meta">
                {row.skill?.toString().toLowerCase().replace('_', ' ') ?? row.type.toLowerCase().replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">Type</span>
              <span className="t-meta">{row.type.toLowerCase().replace('_', ' ')}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">Channel</span>
              <ChannelPill channel={row.customer.channel} />
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">Confidence</span>
              <ConfidenceMeter value={row.confidence} variant="inline" />
            </div>
          </div>
        </SheetSection>

        <SheetSection eyebrow="Next" title="Take action">
          <p className="t-small">
            Lifecycle actions (assign · escalate · resolve · reopen · cancel · operator review ·
            advance flow) live on the dedicated ticket detail page, where the full timeline and
            permission-gated controls are available.
          </p>
        </SheetSection>
      </SheetBody>

      <SheetFooter>
        <span className="t-meta-xs">Read-only summary · open ticket for actions</span>
        <span className="flex-1" />
        <Link
          href={`/workspace/modules/pulse/tickets/${row.id}`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-brand-200/70 bg-brand-50/70 px-4 text-xs font-semibold text-brand-700 shadow-soft transition-soft hover:bg-brand-50 active:scale-[0.97] dark:border-brand-800/55 dark:bg-brand-900/25 dark:text-brand-300 dark:hover:bg-brand-900/40"
        >
          Open ticket
          <ArrowUpRight size={12} />
        </Link>
      </SheetFooter>
    </Sheet>
  );
}

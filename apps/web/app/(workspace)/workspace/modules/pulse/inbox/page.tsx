import Link from 'next/link';
import {ArrowUpRight, Inbox, Sparkles} from 'lucide-react';
import {PageHeader} from '@/components/ui/page-header';
import {LoadState} from '@/components/ui/load-state';
import {ConfidenceMeter} from '@/components/pulse/confidence-meter';
import {
  ChannelPill,
  EscalationBadge,
  PriorityPill,
  SkillPill,
  TicketStatusPill,
} from '@/components/pulse/status-pills';
import {loadInboxLanes} from '@/lib/pulse/loaders';
import type {PulseTicketRow} from '@/lib/pulse/types';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Inbox — Pulse'};

/**
 * Pulse Inbox — operational queue.
 *
 * Read this page like an air-traffic-control screen, not a chat app:
 *   - lane 1 ▸ items needing operator review (top priority, urgent first)
 *   - lane 2 ▸ live items (in-flight conversations the AI is handling)
 *   - lane 3 ▸ waiting on customer (no action required, low signal)
 */

function ageOf(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1)  return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default async function PulseInboxPage() {
  const result = await loadInboxLanes();

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        eyebrow="Pulse · Workspace"
        title="Inbox"
        description="The operational queue. Triage what needs operator attention, watch what the AI is handling, and only intervene where it adds value."
        icon={<Inbox size={26} />}
        iconGradient="from-brand-500 to-accent-500"
        glowColor="bg-brand-500/15"
      />

      {result.kind === 'forbidden' && (
        <LoadState
          variant="forbidden"
          title="You don’t have permission to view the inbox."
          description="The inbox requires the tickets:read permission. Ask an admin to grant it."
        />
      )}

      {result.kind === 'error' && (
        <LoadState
          variant="error"
          title="We couldn’t load the inbox right now."
          description={`The Pulse API returned ${result.status || 'a network error'}: ${result.message}`}
        />
      )}

      {result.kind === 'ok' && (
        <Loaded
          needsReview={result.data.needsReview}
          open={result.data.open}
          waiting={result.data.waiting}
        />
      )}
    </div>
  );
}

function Loaded({
  needsReview,
  open,
  waiting,
}: {
  needsReview: ReadonlyArray<PulseTicketRow>;
  open:        ReadonlyArray<PulseTicketRow>;
  waiting:     ReadonlyArray<PulseTicketRow>;
}) {
  return (
    <>
      {/* ── Headline counters ─────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Counter label="Needs review"     value={needsReview.length} accent="amber"   icon={<Sparkles size={14} />} />
        <Counter label="In flow"           value={open.length}        accent="blue"    icon={<Inbox size={14} />} />
        <Counter label="Waiting customer"  value={waiting.length}     accent="zinc"    icon={null} />
        <Counter label="Auto-handled"      value="—"                  accent="emerald" icon={null} />
      </section>

      <Lane
        eyebrow="Operator queue"
        title={`${needsReview.length} ticket${needsReview.length === 1 ? '' : 's'} awaiting review`}
        description="The AI handed off because confidence dropped, a playbook step required a human, or a customer requested escalation."
        emptyHint="Nothing in the operator queue right now — all incoming items are within auto-handle confidence."
        rows={needsReview}
      />

      <Lane
        eyebrow="In flow"
        title="Active conversations"
        description="The AI is currently handling these. Watch them passively; only step in if you spot something worth correcting."
        emptyHint="No live items right now."
        rows={open}
        muted
      />

      <Lane
        eyebrow="Watching"
        title="Waiting on customer"
        description="Reply pending from the customer. Pulse will continue the playbook automatically when they respond."
        emptyHint="No items waiting on customers."
        rows={waiting}
        muted
      />
    </>
  );
}

// ─── Counter ─────────────────────────────────────────────────────────

type Accent = 'amber' | 'blue' | 'emerald' | 'zinc';

const ACCENT_TONE: Record<Accent, string> = {
  amber:   'text-amber-700 dark:text-amber-400',
  blue:    'text-blue-700 dark:text-blue-400',
  emerald: 'text-emerald-700 dark:text-emerald-400',
  zinc:    'text-zinc-700 dark:text-zinc-300',
};

function Counter({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  accent: Accent;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />
      <div className="relative flex items-baseline gap-2">
        <span className={`text-2xl font-bold tabular-nums tracking-tight ${ACCENT_TONE[accent]}`}>
          {value}
        </span>
        {icon && (
          <span className={`${ACCENT_TONE[accent]} opacity-70`}>{icon}</span>
        )}
      </div>
      <p className="relative mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

// ─── Lane ────────────────────────────────────────────────────────────

interface LaneProps {
  eyebrow: string;
  title: string;
  description: string;
  emptyHint: string;
  rows: ReadonlyArray<PulseTicketRow>;
  /** Visually de-emphasises the lane (lower-priority queues). */
  muted?: boolean;
}

function Lane({eyebrow, title, description, emptyHint, rows, muted = false}: LaneProps) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="section-eyebrow">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">{description}</p>
        </div>
        <p className="text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-500">
          {rows.length} {rows.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/40 p-8 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
          {emptyHint}
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <QueueRow key={row.id} row={row} muted={muted} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── QueueRow ────────────────────────────────────────────────────────

function QueueRow({row, muted}: {row: PulseTicketRow; muted: boolean}) {
  return (
    <li>
      <Link
        href={`/workspace/modules/pulse/tickets/${row.id}`}
        className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card sm:flex-row sm:items-center sm:gap-5 dark:bg-zinc-900 dark:hover:border-brand-800/60 ${
          muted
            ? 'border-zinc-200/60 dark:border-zinc-800/60'
            : 'border-zinc-200/80 dark:border-zinc-800'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-0 transition-opacity group-hover:opacity-50" />

        {/* Identity */}
        <div className="relative flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/15 to-accent-500/15 text-xs font-bold text-brand-700 ring-1 ring-brand-200/60 dark:text-brand-300 dark:ring-brand-800/60">
            {(row.customer.displayName ?? row.customer.handle).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {row.customer.displayName ?? row.customer.handle}
              </span>
              <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600">
                {row.id}
              </span>
              {row.escalated && <EscalationBadge />}
            </div>
            {row.preview && (
              <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
                {row.preview}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <SkillPill skill={row.skill} />
              <ChannelPill channel={row.customer.channel} />
              <PriorityPill priority={row.priority} />
            </div>
          </div>
        </div>

        {/* Right column: status, confidence, age, arrow */}
        <div className="relative flex shrink-0 items-center gap-3 sm:gap-5">
          <TicketStatusPill status={row.status} />
          <ConfidenceMeter value={row.confidence} variant="inline" />
          <span className="hidden font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-500 sm:inline">
            {ageOf(row.updatedAt)}
          </span>
          <ArrowUpRight
            size={14}
            className="text-zinc-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600 dark:group-hover:text-brand-400"
          />
        </div>
      </Link>
    </li>
  );
}

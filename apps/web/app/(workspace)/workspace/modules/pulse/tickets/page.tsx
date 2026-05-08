import Link from 'next/link';
import {ArrowUpRight, Ticket} from 'lucide-react';
import {PageHeader} from '@/components/ui/page-header';
import {LoadState} from '@/components/ui/load-state';
import {ConfidenceMeter} from '@/components/pulse/confidence-meter';
import {
  ChannelPill,
  EscalationBadge,
  PriorityPill,
  SkillPill,
  TicketStatusPill,
  TicketTypePill,
} from '@/components/pulse/status-pills';
import {loadTicketsPage} from '@/lib/pulse/loaders';
import type {PulseTicketRow} from '@/lib/pulse/types';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Tickets — Pulse'};

function ageOf(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1)  return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default async function PulseTicketsPage() {
  const result = await loadTicketsPage({pageSize: 50});

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        eyebrow="Pulse · Workspace"
        title="Tickets"
        description="Operational ticket lifecycle across types — support, sales, scheduling, marketing, operator review."
        icon={<Ticket size={26} />}
        iconGradient="from-brand-500 to-indigo-500"
        glowColor="bg-brand-500/15"
      />

      {result.kind === 'forbidden' && (
        <LoadState
          variant="forbidden"
          title="You don’t have permission to view tickets."
          description="Tickets require the tickets:read permission. Ask an admin to grant it."
        />
      )}

      {result.kind === 'error' && (
        <LoadState
          variant="error"
          title="We couldn’t load tickets right now."
          description={`The Pulse API returned ${result.status || 'a network error'}: ${result.message}`}
        />
      )}

      {result.kind === 'ok' && <Loaded rows={result.data.rows} total={result.data.total} />}
    </div>
  );
}

function Loaded({rows, total}: {rows: ReadonlyArray<PulseTicketRow>; total: number}) {
  const buckets = {
    needsReview: rows.filter((t) => t.status === 'PENDING_REVIEW'),
    open:        rows.filter((t) => t.status === 'OPEN' || t.status === 'WAITING_CUSTOMER'),
    closed:      rows.filter((t) => t.status === 'RESOLVED' || t.status === 'CANCELLED'),
  };

  if (total === 0) {
    return (
      <LoadState
        variant="empty"
        title="No tickets yet."
        description="When Pulse ingests an inbound message and opens a ticket, it shows up here. Make sure a channel is connected."
      />
    );
  }

  const scored = rows.filter((t) => t.confidence !== null);
  const avgConfidence = scored.length > 0
    ? Math.round((scored.reduce((s, t) => s + (t.confidence ?? 0), 0) / scored.length) * 100)
    : null;

  return (
    <>
      {/* ── Stat strip ──────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Needs review" value={buckets.needsReview.length} accent="amber" />
        <Stat label="Open"          value={buckets.open.length}        accent="blue" />
        <Stat label="Closed"        value={buckets.closed.length}      accent="emerald" />
        <Stat label="Avg confidence" value={avgConfidence !== null ? `${avgConfidence}%` : '—'} accent="zinc" />
      </section>

      {/* ── Buckets ────────────────────────────────────────────── */}
      {buckets.needsReview.length > 0 && (
        <Section
          eyebrow="Operator queue"
          title={`${buckets.needsReview.length} ticket${buckets.needsReview.length === 1 ? '' : 's'} awaiting review`}
          rows={buckets.needsReview}
        />
      )}

      <Section eyebrow="Active" title="Open & waiting" rows={buckets.open} />

      {buckets.closed.length > 0 && (
        <Section eyebrow="Closed" title="Recently resolved" rows={buckets.closed} />
      )}
    </>
  );
}

// ─── Stat ────────────────────────────────────────────────────────────

type Accent = 'amber' | 'blue' | 'emerald' | 'zinc';

const ACCENT_TONE: Record<Accent, string> = {
  amber:   'text-amber-700 dark:text-amber-400',
  blue:    'text-blue-700 dark:text-blue-400',
  emerald: 'text-emerald-700 dark:text-emerald-400',
  zinc:    'text-zinc-700 dark:text-zinc-300',
};

function Stat({label, value, accent}: {label: string; value: number | string; accent: Accent}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />
      <p className={`relative text-2xl font-bold tabular-nums tracking-tight ${ACCENT_TONE[accent]}`}>
        {value}
      </p>
      <p className="relative mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────

interface SectionProps {
  eyebrow: string;
  title: string;
  rows: ReadonlyArray<PulseTicketRow>;
}

function Section({eyebrow, title, rows}: SectionProps) {
  if (rows.length === 0) {
    return (
      <section>
        <div className="mb-4">
          <p className="section-eyebrow">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
        </div>
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/40 p-8 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
          No tickets in this bucket.
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
      </div>

      <ul className="space-y-2">
        {rows.map((t) => (
          <li key={t.id}>
            <Link
              href={`/workspace/modules/pulse/tickets/${t.id}`}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-800/60"
            >
              <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-0 transition-opacity group-hover:opacity-50" />

              {/* Identity column */}
              <div className="relative flex min-w-0 flex-1 items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/15 to-accent-500/15 text-xs font-bold text-brand-700 ring-1 ring-brand-200/60 dark:text-brand-300 dark:ring-brand-800/60">
                  {(t.customer.displayName ?? t.customer.handle).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {t.customer.displayName ?? t.customer.handle}
                    </span>
                    {t.escalated && <EscalationBadge />}
                  </div>
                  {t.preview && (
                    <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {t.preview}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <SkillPill skill={t.skill} />
                    <TicketTypePill type={t.type} />
                    <ChannelPill channel={t.customer.channel} />
                    <PriorityPill priority={t.priority} />
                  </div>
                </div>
              </div>

              {/* Right stack: status, confidence, age, arrow */}
              <div className="relative flex shrink-0 items-center gap-4 sm:gap-6">
                <TicketStatusPill status={t.status} />
                <ConfidenceMeter value={t.confidence} variant="inline" />
                <span className="hidden font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-500 sm:inline">
                  {ageOf(t.updatedAt)}
                </span>
                <ArrowUpRight
                  size={14}
                  className="text-zinc-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600 dark:group-hover:text-brand-400"
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

import Link from 'next/link';
import {notFound} from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  History,
  ShieldAlert,
  Sparkles,
  Ticket,
  XCircle,
} from 'lucide-react';
import {ConfidenceMeter} from '@/components/pulse/confidence-meter';
import {OperationalTimeline} from '@/components/pulse/operational-timeline';
import {
  ChannelPill,
  ConversationStatePill,
  EscalationBadge,
  PriorityPill,
  SkillPill,
  TicketStatusPill,
  TicketTypePill,
} from '@/components/pulse/status-pills';
import {Can} from '@/components/auth/can';
import {LoadState} from '@/components/ui/load-state';
import {loadTicketDetail} from '@/lib/pulse/loaders';
import type {Metadata} from 'next';

interface PageProps {
  params: Promise<{ticketId: string}>;
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
  const {ticketId} = await params;
  return {title: `Ticket ${ticketId} — Pulse`};
}

export default async function PulseTicketDetailPage({params}: PageProps) {
  const {ticketId} = await params;
  const result = await loadTicketDetail(ticketId);

  if (result.kind === 'not_found') {
    notFound();
  }

  if (result.kind === 'forbidden') {
    return (
      <div className="animate-fade-in space-y-8">
        <Link
          href="/workspace/modules/pulse/tickets"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <ArrowLeft size={13} />
          Tickets
        </Link>
        <LoadState
          variant="forbidden"
          title="You don’t have permission to view this ticket."
          description="Tickets require the tickets:read permission. Ask an admin to grant it."
        />
      </div>
    );
  }

  if (result.kind === 'error') {
    return (
      <div className="animate-fade-in space-y-8">
        <Link
          href="/workspace/modules/pulse/tickets"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <ArrowLeft size={13} />
          Tickets
        </Link>
        <LoadState
          variant="error"
          title="We couldn’t load this ticket right now."
          description={`The Pulse API returned ${result.status || 'a network error'}: ${result.message}`}
        />
      </div>
    );
  }

  const ticket = result.data;

  return (
    <div className="animate-fade-in space-y-8">

      {/* ── Top bar: back link + ticket id + actions ──────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/workspace/modules/pulse/tickets"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ArrowLeft size={13} />
            Tickets
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-500">{ticket.id}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ticket.priority === 'URGENT' && <EscalationBadge />}
          <Can permission="tickets:assign">
            <button
              type="button"
              disabled={!ticket.capabilities.canEscalate}
              className="btn-secondary h-9 px-3.5 text-xs disabled:opacity-50"
            >
              <ShieldAlert size={13} />
              Escalate
            </button>
          </Can>
          <Can permission="tickets:resolve">
            <button
              type="button"
              disabled={!ticket.capabilities.canResolve}
              className="btn-secondary h-9 px-3.5 text-xs disabled:opacity-50"
            >
              <CheckCircle2 size={13} />
              Resolve
            </button>
          </Can>
          <Can permission="tickets:write">
            <button
              type="button"
              disabled={!ticket.capabilities.canReopen}
              className="btn-secondary h-9 px-3.5 text-xs disabled:opacity-50"
            >
              Reopen
            </button>
            <button
              type="button"
              className="btn-ghost h-9 px-3.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <XCircle size={13} />
              Cancel
            </button>
          </Can>
        </div>
      </div>

      {/* ── Header card: identity + skill row + summary ───────────────────────── */}
      <header className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
        <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-80" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-[280px] w-[280px] rounded-full bg-brand-500/10 blur-3xl" />

        <div className="relative grid gap-6 p-7 lg:grid-cols-[1fr_240px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TicketStatusPill status={ticket.status} />
              <SkillPill skill={ticket.skill} />
              <TicketTypePill type={ticket.type} />
              <PriorityPill priority={ticket.priority} />
              <ChannelPill channel={ticket.customer.channel} />
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {ticket.customer.displayName ?? ticket.customer.handle}
            </h1>
            <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-500">
              {ticket.customer.handle}
            </p>

            {ticket.aiSummary && (
              <div className="mt-5 rounded-xl border border-brand-200/60 bg-brand-50/40 p-4 dark:border-brand-800/50 dark:bg-brand-900/15">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-brand-600 dark:text-brand-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                    AI summary
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {ticket.aiSummary}
                </p>
              </div>
            )}

            {ticket.reviewRationale && ticket.status === 'PENDING_REVIEW' && (
              <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/60 p-4 dark:border-amber-800/50 dark:bg-amber-900/15">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-amber-700 dark:text-amber-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                    Why this needs review
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-amber-900/80 dark:text-amber-200/80">
                  {ticket.reviewRationale}
                </p>
              </div>
            )}
          </div>

          <ConfidenceMeter value={ticket.confidence} variant="block" label="AI confidence" />
        </div>
      </header>

      {/* ── 2-col grid: timeline (left) + side panels (right) ────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

        {/* Timeline */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-eyebrow">Timeline</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Operational events
              </h2>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            {ticket.timeline.length === 0 ? (
              <LoadState
                variant="empty"
                title="No timeline events yet."
                description="Events appear here as Pulse ingests messages, applies skills, and operators take action."
                className="border-0 p-6"
              />
            ) : (
              <OperationalTimeline events={ticket.timeline} />
            )}
          </div>
        </section>

        {/* Side panels */}
        <aside className="space-y-4">

          {/* Workflow */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <p className="section-eyebrow">Workflow</p>
            <h3 className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Conversation state
            </h3>

            <div className="mt-4 flex items-center gap-2">
              {ticket.workflow.state ? (
                <ConversationStatePill state={ticket.workflow.state} />
              ) : (
                <span className="text-xs text-zinc-500 dark:text-zinc-500">No conversation linked.</span>
              )}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
              Playbook step indicator and progress bar will appear here when Pulse exposes per-ticket flow state via{' '}
              <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] dark:bg-zinc-800">flow/advance</code>.
            </p>
          </section>

          {/* Extracted context */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <p className="section-eyebrow">Extracted context</p>
            <h3 className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {ticket.extracted.intent
                ? <span className="font-mono text-xs">{ticket.extracted.intent}</span>
                : 'Intent unknown'}
            </h3>

            {ticket.extracted.fields.length > 0 ? (
              <dl className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                {ticket.extracted.fields.map(({label, value}) => (
                  <div key={label} className="grid grid-cols-[110px_1fr] gap-3 py-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
                      {label}
                    </dt>
                    <dd className="text-sm text-zinc-800 dark:text-zinc-200">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
                No structured fields surfaced for this ticket yet.
              </p>
            )}
          </section>

          {/* Lifecycle */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <p className="section-eyebrow">Lifecycle</p>
            <h3 className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Status &amp; assignment
            </h3>
            <dl className="mt-4 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500 dark:text-zinc-500">Status</dt>
                <dd className="font-medium text-zinc-800 dark:text-zinc-200">{ticket.status}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500 dark:text-zinc-500">Assigned to</dt>
                <dd className="font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
                  {ticket.assignedUserId ?? 'unassigned'}
                </dd>
              </div>
              {ticket.resolvedAt && (
                <div className="flex items-center justify-between">
                  <dt className="text-zinc-500 dark:text-zinc-500">Resolved</dt>
                  <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                    {new Date(ticket.resolvedAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>

            <Link
              href="/workspace/modules/pulse/timeline"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <History size={11} />
              View tenant-wide timeline
              <ArrowUpRight size={11} />
            </Link>
          </section>

          {/* Ticket id (for support hand-off) */}
          <section className="rounded-2xl border border-dashed border-zinc-200 bg-white/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
              <Ticket size={12} />
              <span className="font-mono">{ticket.id}</span>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-500">
              Live data via <code className="font-mono">/v1/pulse/tickets/:id</code> + <code className="font-mono">/timeline</code>.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

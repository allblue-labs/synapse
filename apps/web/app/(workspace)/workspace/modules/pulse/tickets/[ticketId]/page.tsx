import Link from 'next/link';
import {notFound} from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  History,
  RefreshCw,
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
import {loadTicketDetail} from '@/lib/pulse/fixtures';
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
  const ticket = await loadTicketDetail(ticketId);
  if (!ticket) notFound();

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
          <Can permission="pulse:validate">
            <button
              type="button"
              disabled={!ticket.capabilities.canApprove}
              className="btn-primary h-9 px-3.5 text-xs disabled:opacity-50"
            >
              <CheckCircle2 size={13} />
              Approve
            </button>
          </Can>
          <Can permission="pulse:reject">
            <button
              type="button"
              disabled={!ticket.capabilities.canReject}
              className="btn-secondary h-9 px-3.5 text-xs disabled:opacity-50"
            >
              <XCircle size={13} />
              Reject
            </button>
          </Can>
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
              Resolve
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
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white/60 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <RefreshCw size={11} />
              Refresh
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <OperationalTimeline events={ticket.timeline} />
          </div>
        </section>

        {/* Side panels */}
        <aside className="space-y-4">

          {/* Workflow */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <p className="section-eyebrow">Workflow</p>
            <h3 className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              State &amp; playbook
            </h3>

            <div className="mt-4 flex items-center gap-2">
              <ConversationStatePill state={ticket.workflow.state} />
            </div>

            {ticket.workflow.playbookStep ? (
              <div className="mt-4 rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
                  Playbook
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {ticket.workflow.playbookStep.playbookName}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                    {ticket.workflow.playbookStep.stepIndex}/{ticket.workflow.playbookStep.stepCount}
                  </span>
                  <span>{ticket.workflow.playbookStep.stepLabel}</span>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-700/50">
                  <div
                    className="bar-progress h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-500"
                    style={{['--w' as string]: `${(ticket.workflow.playbookStep.stepIndex / ticket.workflow.playbookStep.stepCount) * 100}%`} as React.CSSProperties}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
                No active playbook — running on default skill flow.
              </p>
            )}
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
                No structured fields extracted — operator review will categorise this ticket.
              </p>
            )}
          </section>

          {/* Lifecycle */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
            <p className="section-eyebrow">Lifecycle</p>
            <h3 className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Created &amp; updated
            </h3>
            <dl className="mt-4 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500 dark:text-zinc-500">Created</dt>
                <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                  {new Date(ticket.createdAt).toLocaleString()}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500 dark:text-zinc-500">Updated</dt>
                <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                  {new Date(ticket.updatedAt).toLocaleString()}
                </dd>
              </div>
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
              Pending backend integration — data shown is local fixture. Real Pulse DTOs will replace it in Stage 1C.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

import Link from 'next/link';
import {ArrowRight, Ticket} from 'lucide-react';
import {LoadState} from '@/components/ui/load-state';
import {TicketsBoard} from '@/components/pulse/tickets-board';
import {loadTicketsPage} from '@/lib/pulse/loaders';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Tickets — Pulse'};

/**
 * Pulse · Tickets — operational directory.
 *
 *   - RSC fetches data (Pulse loader); the client `<TicketsBoard>`
 *     owns search / filter / detail-sheet state.
 *   - Stage-9 pattern: queryable table with toolbar + filter chips,
 *     detail sheet on row click, inline `Inspect` + `Open` actions.
 *   - Lifecycle mutations stay on the per-ticket detail page (where
 *     `TicketActionBar` already owns them).
 */

export default async function PulseTicketsPage() {
  const result = await loadTicketsPage({pageSize: 50});

  return (
    <div className="stack-page">
      <Hero />

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

      {result.kind === 'not_found' && (
        <LoadState
          variant="empty"
          title="No tickets endpoint."
          description="The Pulse tickets endpoint returned not found for this tenant."
        />
      )}

      {result.kind === 'ok' && (
        result.data.total === 0 ? (
          <LoadState
            variant="empty"
            title="No tickets yet."
            description="When Pulse ingests an inbound message and opens a ticket, it shows up here. Make sure a channel is connected."
          />
        ) : (
          <TicketsBoard rows={result.data.rows} total={result.data.total} />
        )
      )}
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/55 bg-gradient-to-br from-white/80 via-white/55 to-white/35 backdrop-blur-xl shadow-glass dark:border-zinc-800/55 dark:from-zinc-900/65 dark:via-zinc-900/40 dark:to-zinc-900/25 dark:shadow-glass-dark">
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-70" />
      <div className="pointer-events-none absolute -right-12 -top-32 h-[360px] w-[360px] rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
        <div>
          <p className="section-eyebrow flex items-center gap-2">
            <Ticket size={11} />
            Pulse · tickets
          </p>
          <h1 className="t-h1 mt-3">Operational ticket directory.</h1>
          <p className="t-body mt-3 max-w-lg">
            Search, filter, and inspect every ticket Pulse has touched. Lifecycle
            actions live on the dedicated ticket detail page — this view is for
            triage and discovery.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link href="/workspace/modules/pulse/inbox" className="btn-secondary h-9 px-3 text-xs">
              Open inbox
              <ArrowRight size={11} />
            </Link>
            <Link href="/workspace/modules/pulse/timeline" className="btn-ghost h-9 px-3 text-xs">
              Open timeline
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

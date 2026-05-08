import {
  ArrowLeftRight,
  ArrowRight,
  Bot,
  CheckCircle2,
  CornerDownRight,
  Inbox,
  MessageCircle,
  PenSquare,
  ShieldAlert,
  Sparkles,
  StickyNote,
  Ticket,
  UserCheck,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {ConfidenceMeter} from './confidence-meter';
import type {PulseTimelineEvent} from '@/lib/pulse/types';

/**
 * OperationalTimeline — vertical timeline for a single ticket / item.
 *
 *   - Visual rhythm: 32px gutter on the left for the event icon, the
 *     spine line connects every node so a long timeline feels like one
 *     coherent stream.
 *   - Event-kind drives the icon + accent. Actor type tints the avatar
 *     (system / AI / customer / operator / integration).
 *   - Inline ConfidenceMeter when the event carries a confidence score.
 *   - Optional structured payload renders as a key/value chip strip
 *     beneath the summary, matching the AI-extracted-data look used
 *     on the ticket detail header.
 *
 * Pure presentational. The parent owns data loading and pagination.
 */

const KIND_ICON: Record<PulseTimelineEvent['kind'], LucideIcon> = {
  'ticket.opened':      Ticket,
  'message.inbound':    MessageCircle,
  'message.outbound':   ArrowRight,
  'ai.extracted':       Sparkles,
  'ai.decision':        Bot,
  'skill.routed':       ArrowLeftRight,
  'playbook.step':      CornerDownRight,
  'operator.review':    UserCheck,
  'operator.approved':  CheckCircle2,
  'operator.rejected':  XCircle,
  'status.changed':     PenSquare,
  'integration.action': Zap,
  'note.added':         StickyNote,
};

const ACTOR_TONE: Record<
  PulseTimelineEvent['actor']['type'],
  {ring: string; bg: string; text: string}
> = {
  SYSTEM: {
    ring: 'ring-zinc-200 dark:ring-zinc-700',
    bg:   'bg-white dark:bg-zinc-900',
    text: 'text-zinc-500 dark:text-zinc-400',
  },
  USER: {
    ring: 'ring-amber-200 dark:ring-amber-800/60',
    bg:   'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
  },
  CUSTOMER: {
    ring: 'ring-blue-200 dark:ring-blue-800/60',
    bg:   'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
  },
  AI: {
    ring: 'ring-brand-200 dark:ring-brand-800/60',
    bg:   'bg-brand-50 dark:bg-brand-900/30',
    text: 'text-brand-700 dark:text-brand-400',
  },
  INTEGRATION: {
    ring: 'ring-violet-200 dark:ring-violet-800/60',
    bg:   'bg-violet-50 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-400',
  },
};

function relativeFormatter(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function absoluteFormatter(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface OperationalTimelineProps {
  events: ReadonlyArray<PulseTimelineEvent>;
  /** Show oldest → newest (default: newest → oldest). */
  ascending?: boolean;
  /** Optional empty-state slot for tickets without any events yet. */
  emptyState?: React.ReactNode;
  className?: string;
}

export function OperationalTimeline({
  events,
  ascending = false,
  emptyState,
  className,
}: OperationalTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-dashed border-zinc-200 bg-white/40 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40', className)}>
        {emptyState ?? (
          <>
            <Inbox size={20} className="mx-auto text-zinc-400" />
            <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              No events yet.
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              The timeline starts when the first inbound message arrives.
            </p>
          </>
        )}
      </div>
    );
  }

  const ordered = ascending ? events : [...events].reverse();

  return (
    <ol className={cn('relative space-y-1', className)}>
      {/* Spine — sits behind the icons, masked at the very bottom. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-zinc-200 via-zinc-200 to-transparent dark:from-zinc-800 dark:via-zinc-800"
      />

      {ordered.map((event, idx) => (
        <TimelineRow key={event.id} event={event} isFirst={idx === 0} />
      ))}
    </ol>
  );
}

function TimelineRow({event, isFirst}: {event: PulseTimelineEvent; isFirst: boolean}) {
  const Icon = KIND_ICON[event.kind] ?? PenSquare;
  const tone = ACTOR_TONE[event.actor.type];
  const isEscalation = event.kind === 'ai.decision' && event.confidence !== undefined && event.confidence < 0.65;

  return (
    <li className="relative grid grid-cols-[32px_1fr] gap-3">
      {/* Icon node */}
      <div className="flex justify-center pt-1">
        <span
          className={cn(
            'relative z-[1] flex h-7 w-7 items-center justify-center rounded-full ring-2',
            tone.bg, tone.ring,
          )}
        >
          <Icon size={13} className={tone.text} />
          {isEscalation && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-900"
            >
              <ShieldAlert size={8} className="text-white" />
            </span>
          )}
        </span>
      </div>

      {/* Content */}
      <div
        className={cn(
          'min-w-0 pb-5',
          // Subtle backdrop for the *first* (most recent) event so the
          // eye lands on the latest action without a heavy card.
          isFirst && 'rounded-lg bg-zinc-50/60 px-3 py-2 -mx-3 -my-1 dark:bg-zinc-900/60',
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className={cn('text-[11px] font-semibold uppercase tracking-widest', tone.text)}>
            {event.actor.label}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600" title={absoluteFormatter(event.occurredAt)}>
            · {relativeFormatter(event.occurredAt)}
          </span>
          {event.confidence !== undefined && (
            <ConfidenceMeter value={event.confidence} variant="inline" className="ml-auto" />
          )}
        </div>

        <p className="mt-0.5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          {event.summary}
        </p>

        {event.payload && Object.keys(event.payload).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(event.payload).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-200/80 bg-white px-1.5 py-0.5 text-[10px] dark:border-zinc-700 dark:bg-zinc-800"
              >
                <span className="text-zinc-400 dark:text-zinc-500">{k}</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{String(v)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

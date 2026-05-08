import {Activity, CalendarClock, Bot, MessageSquare, Settings2, CheckCircle2} from 'lucide-react';
import {PageHeader} from '@/components/ui/page-header';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Activity'};

const EVENT_ICONS = {
  agent:    {icon: Bot,           color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'},
  module:   {icon: MessageSquare, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'},
  schedule: {icon: CalendarClock, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'},
  system:   {icon: Settings2,     color: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400'},
} as const;

type EventType = keyof typeof EVENT_ICONS;

interface ActivityEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  time: string;
}

const MOCK_EVENTS: ActivityEvent[] = [];

function EventRow({event}: {event: ActivityEvent}) {
  const {icon: Icon, color} = EVENT_ICONS[event.type];
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon size={16} />
        </div>
        <div className="mt-2 w-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <div className="pb-6 pt-1">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{event.title}</p>
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{event.description}</p>
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">{event.time}</p>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <div className="animate-fade-in space-y-10">

      <PageHeader
        eyebrow="Real-time feed"
        title="Activity"
        description="A real-time feed of events from agents, modules and system changes."
        icon={<Activity size={26} />}
        iconGradient="from-amber-500 to-orange-500"
        glowColor="bg-amber-500/15"
      />

      {MOCK_EVENTS.length > 0 ? (
        <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />
          <div className="relative">
            {MOCK_EVENTS.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-200 bg-white/40 py-20 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-50" />

          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-500 ring-1 ring-zinc-200 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-400 dark:ring-zinc-700">
            <Activity size={24} />
          </div>
          <h2 className="relative mt-5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            No activity yet
          </h2>
          <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Events from agents, modules and system changes will appear here as they happen.
          </p>
        </section>
      )}

      {/* Legend */}
      <section>
        <p className="section-eyebrow mb-3">Event types</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.entries(EVENT_ICONS) as [EventType, typeof EVENT_ICONS[EventType]][]).map(
            ([type, {icon: Icon, color}]) => (
              <div
                key={type}
                className="relative overflow-hidden rounded-xl border border-zinc-200/80 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-40" />
                <div className="relative flex items-center gap-2.5">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
                    <Icon size={14} />
                  </div>
                  <span className="text-sm font-medium capitalize text-zinc-700 dark:text-zinc-300">
                    {type}
                  </span>
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Note */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />

        <div className="relative flex items-start gap-3">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Live event streaming will be enabled when the first agent or module processes a message.
            Events are retained for 30 days.
          </p>
        </div>
      </section>

    </div>
  );
}

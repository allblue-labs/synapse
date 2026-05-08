import {
  Bot,
  MessageSquare,
  CheckCircle2,
  Activity,
  Zap,
  Layers,
} from 'lucide-react';

/**
 * ProductMockup — stylized hero "screenshot" of Synapse.
 * Shows a mock dashboard with a sidebar, conversation feed, and AI agent reply.
 * Pure SVG/CSS — no real UI, no real data.
 */
export function ProductMockup() {
  return (
    <div className="relative">

      {/* Glow halo behind the mockup */}
      <div className="pointer-events-none absolute -inset-x-12 -inset-y-8 -z-10 rounded-[3rem] bg-brand-500/20 opacity-60 blur-3xl dark:bg-brand-500/30" />
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-2 -z-10 rounded-[2.5rem] bg-accent-400/10 opacity-50 blur-2xl" />

      {/* Window frame */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-elevated ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/10">

        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-zinc-200/80 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>
          <div className="ml-3 flex h-5 flex-1 items-center justify-center rounded-md bg-white px-2 text-[10px] font-medium text-zinc-400 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:ring-zinc-700">
            app.synapse.ai/workspace/modules/pulse
          </div>
        </div>

        {/* Body — sidebar + main content */}
        <div className="grid grid-cols-[180px_1fr]">

          {/* Sidebar */}
          <aside className="border-r border-zinc-200/80 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="mb-3 flex items-center gap-2 px-2">
              <div className="h-6 w-6 rounded-md bg-brand-600" />
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Synapse</span>
            </div>
            <ul className="space-y-0.5">
              {[
                {icon: Layers,        label: 'Overview', active: false},
                {icon: MessageSquare, label: 'Messaging', active: true},
                {icon: Bot,           label: 'Agents',   active: false},
                {icon: Activity,      label: 'Activity', active: false},
                {icon: Zap,           label: 'Automate', active: false},
              ].map(({icon: Icon, label, active}) => (
                <li
                  key={label}
                  className={
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium ' +
                    (active
                      ? 'bg-white text-brand-700 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-brand-300 dark:ring-zinc-700'
                      : 'text-zinc-500 dark:text-zinc-500')
                  }
                >
                  <Icon size={11} />
                  {label}
                </li>
              ))}
            </ul>
          </aside>

          {/* Main */}
          <main className="bg-white p-5 dark:bg-zinc-900">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  Conversation
                </p>
                <h3 className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Maria Silva · WhatsApp
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>

            {/* Conversation */}
            <div className="space-y-2.5">
              {/* User msg */}
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-600 px-3 py-1.5 text-[11px] text-white">
                  Hi! I&apos;d like to schedule an appointment for Thursday afternoon.
                </div>
              </div>

              {/* AI reply with tool use */}
              <div className="flex flex-col items-start gap-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white">
                    <Bot size={10} />
                  </div>
                  <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    Pulse
                  </span>
                  <span className="text-[10px] text-zinc-400">·</span>
                  <span className="text-[10px] text-zinc-400">extracting fields</span>
                </div>
                <div className="ml-6 max-w-[80%] rounded-2xl rounded-tl-sm border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Of course! I have Thursday at 2:00 PM or 4:30 PM available. Which time works best for you?
                </div>
              </div>

              {/* Extracted data card */}
              <div className="ml-6 mt-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-2.5 dark:border-emerald-800/60 dark:bg-emerald-900/20">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Structured data extracted
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">Intent:</span>{' '}
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">schedule_appointment</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">Day:</span>{' '}
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">Thursday</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">Period:</span>{' '}
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">afternoon</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">Confidence:</span>{' '}
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">96%</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Floating accent badge */}
      <div className="absolute -bottom-4 -right-4 hidden rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-card sm:flex sm:items-center sm:gap-2 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-white">
          <Zap size={13} />
        </div>
        <div className="text-[11px] leading-tight">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">Auto-routed</p>
          <p className="text-zinc-500 dark:text-zinc-400">in 142ms</p>
        </div>
      </div>
    </div>
  );
}

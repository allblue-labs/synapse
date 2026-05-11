import Link from "next/link";

import {
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Layers3,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { loadInboxLanes } from "@/lib/pulse/loaders";

const METRICS = [
  {
    label: "Active agents",
    value: "24",
    signal: "+12%",
  },
  {
    label: "Automations running",
    value: "148",
    signal: "+18%",
  },
  {
    label: "Messages processed",
    value: "2.4M",
    signal: "+31%",
  },
  {
    label: "Operational uptime",
    value: "99.98%",
    signal: "stable",
  },
] as const;

const MODULES = [
  {
    icon: MessageSquare,
    title: "Messaging",
    description: "Unified conversations across every customer channel.",
  },
  {
    icon: Bot,
    title: "Agents",
    description: "Autonomous AI execution with memory and tooling.",
  },
  {
    icon: Workflow,
    title: "Automation",
    description: "Event-driven workflows connected across modules.",
  },
  {
    icon: ShieldCheck,
    title: "Security",
    description: "Runtime guardrails and operational governance.",
  },
] as const;

export default async function OverviewPage() {
  const inbox = await loadInboxLanes();

  const lanes =
    inbox.kind === "ok"
      ? [
          {
            id: "needs-review",
            title: "Needs review",
            items: inbox.data.needsReview,
          },
          {
            id: "open",
            title: "Open",
            items: inbox.data.open,
          },
          {
            id: "waiting",
            title: "Waiting customer",
            items: inbox.data.waiting,
          },
        ]
      : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1700px] flex-col px-8 pb-16 pt-8">
        {/* HERO */}
        <section
          className="
            relative
            overflow-hidden
            rounded-[38px]
            border
            border-zinc-200/70
            bg-white/[0.74]
            px-10
            py-10
            backdrop-blur-2xl
            dark:border-zinc-800/80
            dark:bg-zinc-900/[0.68]
          "
        >
          {/* Ambient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.08),transparent_28%)]" />

          {/* Noise */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="h-full w-full bg-[radial-gradient(circle_at_center,black_1px,transparent_1px)] [background-size:24px_24px]" />
          </div>

          <div className="relative flex flex-col gap-10 xl:flex-row xl:items-end xl:justify-between">
            {/* Left */}
            <div className="max-w-[920px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300">
                <Sparkles size={13} className="text-brand-500" />
                Synapse Operational Workspace
              </div>

              <h1 className="mt-7 max-w-[860px] text-[3.5rem] font-semibold leading-[1.03] tracking-[-0.07em] text-zinc-950 dark:text-zinc-50">
                Orchestrate intelligent operations, agents and workflows from a
                unified infrastructure layer.
              </h1>

              <p className="mt-7 max-w-[760px] text-[1.08rem] leading-[1.9] tracking-[-0.01em] text-zinc-600 dark:text-zinc-400">
                Synapse centralizes messaging, automation, AI execution and
                operational telemetry into a single intelligent platform for
                modern teams and digital operations.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/workspace/modules"
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-2xl
                    bg-zinc-950
                    px-5
                    py-3
                    text-sm
                    font-semibold
                    text-white
                    transition-all
                    hover:scale-[1.02]
                    hover:bg-zinc-800
                    dark:bg-white
                    dark:text-zinc-950
                    dark:hover:bg-zinc-200
                  "
                >
                  Open modules
                  <ArrowUpRight size={16} />
                </Link>

                <Link
                  href="/workspace/inbox"
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-2xl
                    border
                    border-zinc-200
                    bg-white/70
                    px-5
                    py-3
                    text-sm
                    font-semibold
                    text-zinc-700
                    backdrop-blur
                    transition-colors
                    hover:border-zinc-300
                    hover:bg-white
                    dark:border-zinc-800
                    dark:bg-zinc-900/70
                    dark:text-zinc-300
                    dark:hover:border-zinc-700
                  "
                >
                  View inbox
                </Link>
              </div>
            </div>

            {/* Right */}
            <div className="grid w-full max-w-[540px] grid-cols-2 gap-4">
              {MODULES.map((module) => {
                const Icon = module.icon;

                return (
                  <div
                    key={module.title}
                    className="
                      group
                      relative
                      overflow-hidden
                      rounded-3xl
                      border
                      border-zinc-200/70
                      bg-white/72
                      p-5
                      backdrop-blur
                      transition-all
                      duration-300
                      hover:-translate-y-[2px]
                      hover:border-zinc-300
                      dark:border-zinc-800/80
                      dark:bg-zinc-900/60
                      dark:hover:border-zinc-700
                    "
                  >
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br from-brand-500/[0.05] to-accent-500/[0.03]" />

                    <div className="relative">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/80 dark:border-zinc-700 dark:bg-zinc-900">
                        <Icon
                          size={18}
                          className="text-zinc-700 dark:text-zinc-200"
                        />
                      </div>

                      <h3 className="mt-5 text-[1rem] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {module.title}
                      </h3>

                      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {module.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* TELEMETRY */}
        <section className="mt-8 overflow-hidden rounded-[34px] border border-zinc-200/70 bg-white/[0.68] backdrop-blur-2xl dark:border-zinc-800/80 dark:bg-zinc-900/[0.58]">
          <div className="flex flex-wrap items-stretch divide-y divide-zinc-200/70 dark:divide-zinc-800/80 xl:divide-x xl:divide-y-0">
            {METRICS.map((metric, idx) => (
              <div
                key={metric.label}
                className="
                  relative
                  flex
                  min-h-[150px]
                  flex-1
                  flex-col
                  justify-between
                  overflow-hidden
                  px-8
                  py-7
                "
              >
                <div
                  className={cn(
                    "absolute left-0 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-zinc-300/60 to-transparent dark:via-zinc-700/60 xl:block",
                    idx === 0 && "hidden",
                  )}
                />

                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />

                    {metric.label}
                  </div>

                  <div className="rounded-full border border-zinc-200/70 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/80">
                    {metric.signal}
                  </div>
                </div>

                <div className="mt-8 flex items-end justify-between">
                  <div>
                    <div className="text-[3rem] font-semibold leading-none tracking-[-0.08em] text-zinc-950 dark:text-zinc-50">
                      {metric.value}
                    </div>

                    <p className="mt-3 text-sm text-zinc-500">
                      Operational telemetry
                    </p>
                  </div>

                  <div className="flex items-end gap-1.5">
                    {[28, 42, 36, 58, 48, 64].map((h, idx) => (
                      <div
                        key={idx}
                        className="
                            w-2.5
                            rounded-full
                            bg-gradient-to-t
                            from-brand-500/70
                            to-cyan-400/70
                          "
                        style={{
                          height: `${h}px`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* EXISTING CONTENT */}
        <section className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          {/* Left */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[34px] border border-zinc-200/70 bg-white/[0.72] backdrop-blur-2xl dark:border-zinc-800/80 dark:bg-zinc-900/[0.62]">
              <div className="flex items-center justify-between border-b border-zinc-200/70 px-7 py-5 dark:border-zinc-800/80">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <BrainCircuit size={13} className="text-brand-500" />
                    Runtime inbox
                  </div>

                  <h2 className="mt-3 text-[1.35rem] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    Active operational flows
                  </h2>
                </div>

                <Link
                  href="/workspace/inbox"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Open inbox
                  <ArrowUpRight size={15} />
                </Link>
              </div>

              <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
                {lanes.map((lane: (typeof lanes)[number]) => (
                  <div
                    key={lane.id}
                    className="flex items-center justify-between px-7 py-5 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200/70 bg-white/80 dark:border-zinc-700 dark:bg-zinc-900/80">
                        <Layers3
                          size={18}
                          className="text-zinc-700 dark:text-zinc-200"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {lane.title}
                        </p>

                        <p className="mt-1 text-sm text-zinc-500">
                          {lane.items.length} active items
                        </p>
                      </div>
                    </div>

                    <div className="rounded-full border border-zinc-200/70 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/80">
                      Active
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right */}
          <aside className="space-y-6">
            <div className="overflow-hidden rounded-[34px] border border-zinc-200/70 bg-white/[0.72] backdrop-blur-2xl dark:border-zinc-800/80 dark:bg-zinc-900/[0.62]">
              <div className="border-b border-zinc-200/70 px-6 py-5 dark:border-zinc-800/80">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  Runtime status
                </div>

                <h3 className="mt-3 text-[1.15rem] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Infrastructure operational
                </h3>
              </div>

              <div className="space-y-5 px-6 py-6">
                {[
                  "Messaging cluster",
                  "Agent runtime",
                  "Workflow engine",
                  "Telemetry stream",
                ].map((item) => (
                  <div key={item} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {item}
                    </span>

                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Healthy
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

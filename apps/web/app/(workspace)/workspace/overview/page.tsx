import Link from "next/link";
import type { Metadata } from "next";

import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  Boxes,
  ChartColumn,
  ChartSpline,
  ChevronRight,
  Cpu,
  Inbox,
  Layers3,
  Sparkles,
  Zap,
} from "lucide-react";

import { loadInboxLanes } from "@/lib/pulse/loaders";
import { PulseTicketRow } from "@/lib/pulse/types";

export const metadata: Metadata = {
  title: "Overview",
};

const AI_USAGE_POINTS = [22, 28, 24, 35, 38, 42, 39, 48, 52, 58, 61, 68];

export default async function OverviewPage() {
  const inbox = await loadInboxLanes();

  const data = inbox.kind === "ok" ? inbox.data : null;

  const lanes = data
    ? [
        {
          id: "review",
          title: "Needs review",
          items: data.needsReview,
        },
        {
          id: "open",
          title: "In flow",
          items: data.open,
        },
        {
          id: "waiting",
          title: "Waiting customer",
          items: data.waiting,
        },
      ]
    : [];

  const totalLive =
    (data?.needsReview.length ?? 0) +
    (data?.open.length ?? 0) +
    (data?.waiting.length ?? 0);

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-[1920px] px-4 pb-8 pt-4 sm:px-5 xl:px-6">
        {/* ───────────────────────────── */}
        {/* WORKSPACE TOP */}
        {/* ───────────────────────────── */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[24px]
            border
            border-zinc-200/70
            bg-white/[0.76]
            backdrop-blur-2xl
            dark:border-zinc-800/80
            dark:bg-zinc-900/[0.72]
          "
        >
          {/* ambient */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.07),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.06),transparent_26%)]" />

          {/* top */}
          <div className="relative flex flex-col gap-6 border-b border-zinc-200/70 px-5 py-5 dark:border-zinc-800/80 xl:flex-row xl:items-center xl:justify-between">
            {/* left */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Workspace live
              </div>

              <h1 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.06em] text-zinc-950 dark:text-zinc-50">
                Synapse operational intelligence
              </h1>

              <p className="mt-2 max-w-[780px] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Unified AI orchestration, messaging, telemetry and operational
                workflows.
              </p>
            </div>

            {/* right */}
            <div className="flex flex-wrap items-center gap-2">
              <TopAction
                href="/workspace/modules/pulse/inbox"
                icon={Inbox}
                label="Inbox"
                primary
              />

              <TopAction
                href="/workspace/modules"
                icon={Boxes}
                label="Modules"
              />

              <TopAction href="/workspace/agents" icon={Bot} label="Agents" />
            </div>
          </div>

          {/* signal strip */}
          <div className="grid grid-cols-2 divide-x divide-y divide-zinc-200/70 dark:divide-zinc-800/80 xl:grid-cols-5 xl:divide-y-0">
            <SignalItem
              label="Live"
              value={String(totalLive)}
              hint="runtime items"
              tone="brand"
            />

            <SignalItem label="Agents" value="24" hint="active" tone="violet" />

            <SignalItem
              label="Workflows"
              value="148"
              hint="running"
              tone="emerald"
            />

            <SignalItem
              label="AI usage"
              value="2.4M"
              hint="inference"
              tone="amber"
            />

            <SignalItem
              label="Runtime"
              value="99.98%"
              hint="healthy"
              tone="zinc"
            />
          </div>
        </section>

        {/* ───────────────────────────── */}
        {/* MAIN GRID */}
        {/* ───────────────────────────── */}

        <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* LEFT */}
          <div className="space-y-5">
            {/* ───────────────────────── */}
            {/* AI ANALYTICS */}
            {/* ───────────────────────── */}

            <section
              className="
                relative
                overflow-hidden
                rounded-[24px]
                border
                border-zinc-200/70
                bg-white/[0.76]
                backdrop-blur-2xl
                dark:border-zinc-800/80
                dark:bg-zinc-900/[0.72]
              "
            >
              <div className="flex flex-col gap-4 border-b border-zinc-200/70 px-5 py-5 dark:border-zinc-800/80 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <Sparkles size={12} className="text-brand-500" />
                    Intelligence analytics
                  </div>

                  <h2 className="mt-2 text-[1.15rem] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    AI runtime usage
                  </h2>
                </div>

                {/* toggle */}
                <div className="inline-flex items-center rounded-xl border border-zinc-200/70 bg-zinc-100/70 p-1 dark:border-zinc-800/80 dark:bg-zinc-900/70">
                  <button
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-lg
                      bg-white
                      px-3
                      py-1.5
                      text-xs
                      font-semibold
                      text-zinc-900
                      shadow-sm
                      dark:bg-zinc-800
                      dark:text-zinc-100
                    "
                  >
                    <ChartSpline size={13} />
                    Line
                  </button>

                  <button
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-lg
                      px-3
                      py-1.5
                      text-xs
                      font-semibold
                      text-zinc-500
                      transition-colors
                      hover:text-zinc-900
                      dark:hover:text-zinc-100
                    "
                  >
                    <ChartColumn size={13} />
                    Bars
                  </button>
                </div>
              </div>

              {/* graph */}
              <div className="px-5 pb-5 pt-4">
                <div className="relative h-[240px] overflow-hidden rounded-[18px] border border-zinc-200/70 bg-gradient-to-b from-zinc-50 to-white dark:border-zinc-800/80 dark:from-zinc-900 dark:to-zinc-950">
                  {/* grid */}
                  <div className="absolute inset-0">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 border-t border-dashed border-zinc-200/70 dark:border-zinc-800/80"
                        style={{
                          top: `${(i + 1) * 16}%`,
                        }}
                      />
                    ))}
                  </div>

                  {/* fake chart */}
                  <div className="absolute inset-x-0 bottom-0 top-0 flex items-end gap-2 px-6 pb-6">
                    {AI_USAGE_POINTS.map((value, idx) => (
                      <div
                        key={idx}
                        className="
                            group
                            relative
                            flex-1
                          "
                      >
                        <div
                          className="
                              absolute
                              inset-x-0
                              bottom-0
                              rounded-t-[10px]
                              bg-gradient-to-t
                              from-brand-500
                              to-cyan-400
                              opacity-90
                              transition-all
                              duration-300
                              group-hover:opacity-100
                            "
                          style={{
                            height: `${value}%`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ───────────────────────── */}
            {/* LIVE OPERATIONS */}
            {/* ───────────────────────── */}

            <section
              className="
                relative
                overflow-hidden
                rounded-[24px]
                border
                border-zinc-200/70
                bg-white/[0.76]
                backdrop-blur-2xl
                dark:border-zinc-800/80
                dark:bg-zinc-900/[0.72]
              "
            >
              {/* top */}
              <div className="flex items-center justify-between border-b border-zinc-200/70 px-5 py-4 dark:border-zinc-800/80">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <BrainCircuit size={12} className="text-brand-500" />
                    Operational stream
                  </div>

                  <h2 className="mt-2 text-[1.15rem] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    Live inbox runtime
                  </h2>
                </div>

                <Link
                  href="/workspace/modules/pulse/inbox"
                  className="
                    inline-flex
                    items-center
                    gap-2
                    text-xs
                    font-semibold
                    text-zinc-500
                    transition-colors
                    hover:text-zinc-950
                    dark:hover:text-zinc-100
                  "
                >
                  Open inbox
                  <ArrowRight size={13} />
                </Link>
              </div>

              {/* lanes */}
              <div className="grid grid-cols-1 divide-y divide-zinc-200/70 dark:divide-zinc-800/80 xl:grid-cols-3 xl:divide-x xl:divide-y-0">
                {lanes.map((lane) => (
                  <div key={lane.id} className="min-w-0">
                    {/* lane top */}
                    <div className="flex items-center justify-between border-b border-zinc-200/70 px-5 py-4 dark:border-zinc-800/80">
                      <div>
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {lane.title}
                        </div>

                        <div className="mt-1 text-xs text-zinc-500">
                          {lane.items.length} active
                        </div>
                      </div>

                      <div
                        className="
                          rounded-full
                          border
                          border-zinc-200/70
                          bg-zinc-100/70
                          px-2.5
                          py-1
                          text-[9px]
                          font-semibold
                          uppercase
                          tracking-[0.16em]
                          text-zinc-500
                          dark:border-zinc-700
                          dark:bg-zinc-800/70
                        "
                      >
                        Live
                      </div>
                    </div>

                    {/* items */}
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {lane.items.slice(0, 6).map((item: PulseTicketRow) => (
                        <Link
                          key={item.id}
                          href={`/workspace/modules/pulse/tickets/${item.id}`}
                          className="
                              group
                              flex
                              items-start
                              gap-3
                              px-5
                              py-4
                              transition-colors
                              hover:bg-zinc-50/70
                              dark:hover:bg-zinc-800/20
                            "
                        >
                          <div
                            className="
                                mt-0.5
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-xl
                                border
                                border-zinc-200/70
                                bg-white/80
                                dark:border-zinc-700
                                dark:bg-zinc-900/80
                              "
                          >
                            <Layers3
                              size={14}
                              className="text-zinc-700 dark:text-zinc-200"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {item.customer.displayName ??
                                item.customer.handle}
                            </div>

                            <div className="mt-1 truncate text-xs text-zinc-500">
                              {item.preview ||
                                `${item.skill.toLowerCase()} · ${item.priority.toLowerCase()}`}
                            </div>
                          </div>

                          <ChevronRight
                            size={14}
                            className="
                                mt-1
                                text-zinc-400
                                opacity-0
                                transition-all
                                group-hover:translate-x-0.5
                                group-hover:opacity-100
                              "
                          />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <aside className="space-y-5">
            {/* runtime */}
            <section
              className="
                relative
                overflow-hidden
                rounded-[24px]
                border
                border-zinc-200/70
                bg-white/[0.76]
                backdrop-blur-2xl
                dark:border-zinc-800/80
                dark:bg-zinc-900/[0.72]
              "
            >
              <div className="border-b border-zinc-200/70 px-5 py-4 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  <Activity size={12} className="text-emerald-500" />
                  Runtime
                </div>

                <h2 className="mt-2 text-[1.1rem] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Infrastructure health
                </h2>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {[
                  "Messaging cluster",
                  "AI runtime",
                  "Workflow engine",
                  "Queue workers",
                  "Telemetry stream",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />

                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {item}
                      </span>
                    </div>

                    <div
                      className="
                        rounded-full
                        border
                        border-emerald-200
                        bg-emerald-50
                        px-2.5
                        py-1
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-[0.16em]
                        text-emerald-700
                        dark:border-emerald-900/40
                        dark:bg-emerald-900/20
                        dark:text-emerald-400
                      "
                    >
                      Healthy
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* shortcuts */}
            <section
              className="
                relative
                overflow-hidden
                rounded-[24px]
                border
                border-zinc-200/70
                bg-white/[0.76]
                backdrop-blur-2xl
                dark:border-zinc-800/80
                dark:bg-zinc-900/[0.72]
              "
            >
              <div className="border-b border-zinc-200/70 px-5 py-4 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  <Zap size={12} className="text-brand-500" />
                  Quick access
                </div>

                <h2 className="mt-2 text-[1.1rem] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Workspace shortcuts
                </h2>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                <Shortcut
                  href="/workspace/modules"
                  icon={Boxes}
                  label="Module store"
                />

                <Shortcut
                  href="/workspace/agents"
                  icon={Bot}
                  label="AI agents"
                />

                <Shortcut
                  href="/workspace/modules/pulse/inbox"
                  icon={Inbox}
                  label="Pulse inbox"
                />

                <Shortcut
                  href="/workspace/activity"
                  icon={Activity}
                  label="Activity stream"
                />

                <Shortcut
                  href="/workspace/settings"
                  icon={Cpu}
                  label="Workspace settings"
                />
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}

/* ───────────────────────────── */
/* COMPONENTS */
/* ───────────────────────────── */

function TopAction({
  href,
  icon: Icon,
  label,
  primary,
}: {
  href: string;
  icon: typeof Inbox;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? `
            inline-flex
            items-center
            gap-2
            rounded-xl
            bg-zinc-950
            px-3.5
            py-2
            text-xs
            font-semibold
            text-white
            transition-colors
            hover:bg-zinc-800
            dark:bg-white
            dark:text-zinc-950
          `
          : `
            inline-flex
            items-center
            gap-2
            rounded-xl
            border
            border-zinc-200/70
            bg-white/70
            px-3.5
            py-2
            text-xs
            font-semibold
            text-zinc-700
            transition-colors
            hover:border-zinc-300
            dark:border-zinc-800
            dark:bg-zinc-900/70
            dark:text-zinc-300
          `
      }
    >
      <Icon size={13} />

      {label}
    </Link>
  );
}

function SignalItem({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "brand" | "violet" | "emerald" | "amber" | "zinc";
}) {
  const toneClass = {
    brand: "text-brand-600 dark:text-brand-400",
    violet: "text-violet-600 dark:text-violet-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    zinc: "text-zinc-900 dark:text-zinc-100",
  }[tone];

  return (
    <div className="px-5 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </div>

      <div
        className={`
          mt-3
          text-[1.9rem]
          font-semibold
          tracking-[-0.06em]
          ${toneClass}
        `}
      >
        {value}
      </div>

      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
    </div>
  );
}

function Shortcut({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Inbox;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="
        group
        flex
        items-center
        gap-3
        px-5
        py-4
        transition-colors
        hover:bg-zinc-50/70
        dark:hover:bg-zinc-800/20
      "
    >
      <div
        className="
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-xl
          border
          border-zinc-200/70
          bg-white/80
          dark:border-zinc-700
          dark:bg-zinc-900/80
        "
      >
        <Icon size={14} className="text-zinc-700 dark:text-zinc-200" />
      </div>

      <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
        {label}
      </span>

      <ChevronRight
        size={14}
        className="
          text-zinc-400
          opacity-0
          transition-all
          group-hover:translate-x-0.5
          group-hover:opacity-100
        "
      />
    </Link>
  );
}

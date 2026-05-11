'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  MessageSquare,
  Bot,
  Workflow,
  BarChart2,
  ArrowUpRight,
} from 'lucide-react';

const CARD_WIDTH = 400;
const GAP_WIDTH = 24;
const AUTO_PLAY_DELAY = 2800;

const MODULES = [
  {
    icon: MessageSquare,
    title: 'Messaging',
    eyebrow: 'Channels & inbox',
    description:
      'Unified conversational infrastructure for WhatsApp, Telegram, Instagram and web channels with shared operational context.',
    badge: 'Available',
    accent:
      'from-blue-500/[0.08] via-cyan-500/[0.03] to-transparent',
    iconBg:
      'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    capabilities: [
      'Realtime routing',
      'Shared inbox',
      'Multi-channel',
    ],
  },
  {
    icon: Bot,
    title: 'Agents',
    eyebrow: 'AI orchestration',
    description:
      'Deploy autonomous agents with memory, tools, guardrails and execution monitoring across every customer interaction.',
    badge: 'Available',
    accent:
      'from-indigo-500/[0.08] via-violet-500/[0.03] to-transparent',
    iconBg:
      'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    capabilities: [
      'Tool calling',
      'Memory',
      'Guardrails',
    ],
  },
  {
    icon: Workflow,
    title: 'Automation',
    eyebrow: 'Event-driven flows',
    description:
      'Coordinate workflows between modules, approvals, events and external systems with execution visibility.',
    badge: 'Beta',
    accent:
      'from-amber-500/[0.08] via-orange-500/[0.03] to-transparent',
    iconBg:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    capabilities: [
      'Event triggers',
      'Human approval',
      'Webhooks',
    ],
  },
  {
    icon: BarChart2,
    title: 'Analytics',
    eyebrow: 'Insights & observability',
    description:
      'Monitor conversations, agent performance and operational metrics with realtime visibility across your platform.',
    badge: 'Coming soon',
    accent:
      'from-emerald-500/[0.08] via-teal-500/[0.03] to-transparent',
    iconBg:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    capabilities: [
      'Realtime metrics',
      'Conversion tracking',
      'Exports',
    ],
  },
] as const;

export function ModulesRail() {
  const railRef =
    useRef<HTMLDivElement | null>(null);

  const [activeIndex, setActiveIndex] =
    useState(0);

  const [paused, setPaused] =
    useState(false);

  const scrollToItem = (idx: number) => {
    if (!railRef.current) return;

    railRef.current.scrollTo({
      left: idx * (CARD_WIDTH + GAP_WIDTH),
      behavior: 'smooth',
    });

    setActiveIndex(idx);
  };

  // Auto play
  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next =
          prev >= MODULES.length - 1
            ? 0
            : prev + 1;

        if (railRef.current) {
          railRef.current.scrollTo({
            left:
              next *
              (CARD_WIDTH + GAP_WIDTH),
            behavior: 'smooth',
          });
        }

        return next;
      });
    }, AUTO_PLAY_DELAY);

    return () => clearInterval(interval);
  }, [paused]);

  // Sync on scroll
  useEffect(() => {
    const rail = railRef.current;

    if (!rail) return;

    const handleScroll = () => {
      const index = Math.round(
        rail.scrollLeft /
          (CARD_WIDTH + GAP_WIDTH),
      );

      setActiveIndex(index);
    };

    rail.addEventListener(
      'scroll',
      handleScroll,
      {
        passive: true,
      },
    );

    return () =>
      rail.removeEventListener(
        'scroll',
        handleScroll,
      );
  }, []);

  return (
    <div className="relative mt-16">

      {/* Full bleed */}
      <div className="relative left-1/2 w-screen -translate-x-1/2">

        {/* Ambient edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-20 bg-gradient-to-r from-white/50 to-transparent dark:from-zinc-950/40" />

        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-20 bg-gradient-to-l from-white/50 to-transparent dark:from-zinc-950/40" />

        {/* Rail */}
        <div
          ref={railRef}
          className="
            flex
            snap-x
            snap-mandatory
            gap-6
            overflow-x-auto
            px-[max(calc((100vw-400px)/2),120px)]
            pb-8
            pt-2
            [-ms-overflow-style:none]
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
        >

          {MODULES.map(({
            icon: Icon,
            title,
            eyebrow,
            description,
            badge,
            accent,
            iconBg,
            capabilities,
          }, idx) => {

            const active =
              activeIndex === idx;

            return (
              <div
                key={title}
                onMouseEnter={() =>
                  setPaused(true)
                }
                onMouseLeave={() =>
                  setPaused(false)
                }
                onFocus={() =>
                  setPaused(true)
                }
                onBlur={() =>
                  setPaused(false)
                }
                className={`
                  group
                  relative
                  min-w-[400px]
                  max-w-[400px]
                  snap-center
                  overflow-hidden
                  rounded-[30px]
                  border
                  bg-white/72
                  p-7
                  backdrop-blur-xl
                  transition-all
                  duration-500
                  dark:bg-zinc-900/60

                  ${
                    active
                      ? `
                        -translate-y-[2px]
                        border-zinc-300
                        shadow-[0_25px_70px_-35px_rgba(0,0,0,0.16)]
                        dark:border-zinc-700
                        dark:shadow-[0_25px_70px_-35px_rgba(0,0,0,0.55)]
                      `
                      : `
                        border-zinc-200/70
                        dark:border-zinc-800/80
                      `
                  }

                  hover:-translate-y-[2px]
                  hover:border-zinc-300
                  hover:shadow-[0_25px_70px_-35px_rgba(0,0,0,0.16)]
                  dark:hover:border-zinc-700
                  dark:hover:shadow-[0_25px_70px_-35px_rgba(0,0,0,0.55)]
                `}
              >

                {/* Ambient */}
                <div
                  className={`
                    absolute
                    inset-0
                    transition-opacity
                    duration-700
                    bg-gradient-to-br
                    ${accent}

                    ${
                      active
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }
                  `}
                />

                <div className="relative flex h-full flex-col">

                  {/* Header */}
                  <div className="flex items-start justify-between">

                    <div className="flex items-center gap-3.5">

                      <div
                        className={`
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-2xl
                          ring-1
                          ring-black/[0.04]
                          dark:ring-white/[0.06]
                          ${iconBg}
                        `}
                      >
                        <Icon size={22} />
                      </div>

                      <div>

                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                          {eyebrow}
                        </p>

                        <h3 className="mt-1 text-[1.45rem] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                          {title}
                        </h3>

                      </div>
                    </div>

                    <div className="flex items-center gap-2">

                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>

                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        {badge}
                      </span>

                    </div>
                  </div>

                  {/* Content */}
                  <div className="mt-12 flex-1">

                    <p className="text-[0.97rem] leading-[1.85] tracking-[-0.01em] text-zinc-600 dark:text-zinc-400">
                      {description}
                    </p>

                    {/* Capabilities */}
                    <div className="mt-9 flex flex-wrap gap-2">

                      {capabilities.map((item) => (
                        <span
                          key={item}
                          className="
                            inline-flex
                            items-center
                            rounded-full
                            border
                            border-zinc-200/80
                            bg-white/80
                            px-3
                            py-1.5
                            text-[10px]
                            font-medium
                            uppercase
                            tracking-[0.18em]
                            text-zinc-600
                            backdrop-blur
                            dark:border-zinc-700
                            dark:bg-zinc-900/70
                            dark:text-zinc-300
                          "
                        >
                          {item}
                        </span>
                      ))}

                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-12 flex items-center justify-between border-t border-zinc-200/70 pt-5 dark:border-zinc-800/80">

                    <div className="flex items-center gap-2">

                      <div className="h-2 w-2 rounded-full bg-emerald-400" />

                      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                        Operational
                      </span>

                    </div>

                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors group-hover:text-zinc-900 dark:group-hover:text-zinc-100">

                      Explore

                      <ArrowUpRight
                        size={15}
                        className="transition-transform duration-300 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
                      />

                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div className="mt-8 flex items-center justify-center gap-5">

          {MODULES.map((module, idx) => {
            const active =
              activeIndex === idx;

            return (
              <button
                key={module.title}
                type="button"
                onClick={() =>
                  scrollToItem(idx)
                }
                className="group flex items-center gap-2.5"
              >

                <div className="h-[3px] w-10 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">

                  <div
                    className={`
                      h-full
                      rounded-full
                      bg-gradient-to-r
                      from-brand-500
                      to-accent-500
                      transition-all
                      duration-500
                      ${
                        active
                          ? 'w-full'
                          : 'w-0 group-hover:w-full'
                      }
                    `}
                  />

                </div>

                <span
                  className={`
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-[0.18em]
                    transition-colors
                    ${
                      active
                        ? 'text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'
                    }
                  `}
                >
                  {module.title}
                </span>

              </button>
            );
          })}

        </div>
      </div>
    </div>
  );
}
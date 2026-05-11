import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  MessageSquare,
  Bot,
  BarChart2,
  CalendarClock,
  Mic,
  GitBranch,
  Check,
  Sparkles,
  Shield,
  Workflow,
  Database,
  Globe,
  Star,
} from "lucide-react";
import { SynapseBg } from "@/components/background/synapse-bg";
import { PublicNav } from "@/components/marketing/public-nav";
import { ProductMockup } from "@/components/marketing/product-mockup";
import { ModulesRail } from "@/components/marketing/modules-rail";

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

const TRUSTED_BY = [
  "Helvetica Health",
  "Northstar Clinic",
  "Mercurial Group",
  "Atlas Concierge",
  "Vega Practice",
  "Lumen Care",
] as const;

const MODULES = [
  {
    icon: MessageSquare,
    title: "Messaging",
    eyebrow: "Channels & inbox",
    description:
      "Connect WhatsApp, Telegram, Instagram and more. Unified inbox with smart routing and shared context.",
    features: ["WhatsApp Business", "Telegram & Web", "Shared inbox"],
    href: "#",
    badge: "Available",
    accent: "from-blue-500/15 to-blue-500/5",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    icon: Bot,
    title: "Agents",
    eyebrow: "AI orchestration",
    description:
      "Define agents with tools, knowledge, and guardrails. Deploy across channels and monitor every step.",
    features: [
      "Custom system prompts",
      "Tool & function calling",
      "Knowledge base",
    ],
    href: "#",
    badge: "Available",
    accent: "from-indigo-500/15 to-indigo-500/5",
    iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  {
    icon: Workflow,
    title: "Automation",
    eyebrow: "Event-driven flows",
    description:
      "Build workflows that execute across modules. Triggers, conditions, and human-in-the-loop approval.",
    features: ["Event triggers", "Conditional branches", "Webhooks"],
    href: "#",
    badge: "Beta",
    accent: "from-amber-500/15 to-amber-500/5",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    icon: BarChart2,
    title: "Analytics",
    eyebrow: "Outcomes & insights",
    description:
      "Track conversation outcomes, agent performance, and conversion. Export to your warehouse.",
    features: [
      "Real-time metrics",
      "Conversion funnels",
      "Snowflake / BQ export",
    ],
    href: "#",
    badge: "Coming soon",
    accent: "from-emerald-500/15 to-emerald-500/5",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
] as const;

const FEATURES = [
  {
    icon: Sparkles,
    title: "Drop-in AI agents",
    description:
      "Pre-built agents for scheduling, qualification, and triage — production-ready in minutes, not months.",
  },
  {
    icon: GitBranch,
    title: "Multi-channel routing",
    description:
      "Route every message through the right agent based on intent, channel, customer profile, or business hours.",
  },
  {
    icon: Database,
    title: "Structured extraction",
    description:
      "Capture appointments, leads, and orders as typed records — directly to your CRM or database.",
  },
  {
    icon: Shield,
    title: "Guardrails & compliance",
    description:
      "Per-agent guardrails, PII redaction, audit logs, and full conversation history for review.",
  },
  {
    icon: Globe,
    title: "Multi-tenant from day one",
    description:
      "Workspaces, role-based access, and tenant-isolated data. Built for agencies and platforms.",
  },
  {
    icon: Mic,
    title: "Voice & text, one stack",
    description:
      "Same agent, same context — across WhatsApp text, Instagram DMs, and inbound voice calls.",
  },
] as const;

const USE_CASES = [
  {
    icon: CalendarClock,
    sector: "Clinics & Healthcare",
    headline: "Pulse books and confirms appointments 24/7",
    description:
      "Patients message naturally. Agents extract intent, propose slots, and confirm — handing off cleanly to staff for edge cases.",
    bullets: [
      "Appointment scheduling",
      "Pre-screening triage",
      "Insurance qualification",
    ],
  },
  {
    icon: Bot,
    sector: "Sales & Lead Capture",
    headline: "Qualify and route inbound leads in real time",
    description:
      "Your reps wake up to qualified leads, not a backlog of cold messages. Every lead enriched, scored, and routed.",
    bullets: [
      "Inbound qualification",
      "CRM sync",
      "Smart routing by territory",
    ],
  },
  {
    icon: Workflow,
    sector: "Support & Operations",
    headline: "Tier-1 resolved by AI, escalations routed to humans",
    description:
      "Agents resolve common requests, capture structured data, and hand off to humans with full context when needed.",
    bullets: ["Auto-resolve FAQ", "Order status & refunds", "Smart escalation"],
  },
] as const;

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    description:
      "For small teams getting started with one channel and one agent.",
    features: [
      "1 workspace",
      "1 channel (WhatsApp / Telegram)",
      "1 active agent",
      "1,000 messages / month",
      "Community support",
    ],
    cta: "Start free",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$79",
    period: "per workspace / month",
    description:
      "For growing teams with multiple channels and active automations.",
    features: [
      "Unlimited workspaces",
      "All channels (WhatsApp, Telegram, IG, Web)",
      "Up to 10 active agents",
      "50,000 messages / month",
      "Automation workflows",
      "Priority email support",
    ],
    cta: "Start 14-day trial",
    href: "/login",
    highlighted: true,
  },
  {
    name: "Business",
    price: "Custom",
    period: "tailored to your scale",
    description:
      "For platforms, agencies, and enterprises with high volume and custom needs.",
    features: [
      "Unlimited everything",
      "Custom integrations",
      "Dedicated infrastructure",
      "SAML SSO & SCIM",
      "SOC 2 & DPA",
      "24/7 dedicated support",
    ],
    cta: "Contact sales",
    href: "mailto:hello@synapse.ai",
    highlighted: false,
  },
] as const;

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <PublicNav />

      {/* ════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <SynapseBg />

        <div className="relative container-page pb-20 pt-16 sm:pt-24 lg:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            {/* ── Left: copy ───────────────────── */}
            <div className="text-center lg:text-left">
              <div className="inline-flex">
                <div className="pill-brand animate-fade-in">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
                  </span>
                  Now in private beta — Join the waitlist
                </div>
              </div>

              <h1 className="mt-6 h-display text-zinc-900 dark:text-zinc-50">
                AI agents for{" "}
                <span className="text-gradient">every conversation</span> your
                business has.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400 lg:text-[1.0625rem]">
                Synapse is the orchestration platform for AI-powered messaging.
                Connect channels, deploy custom agents, and automate workflows —
                all from a single multi-tenant SaaS.
              </p>

              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start">
                <Link href="/login" className="btn-primary group h-11 px-6">
                  Start building free
                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
                <a href="#modules" className="btn-secondary h-11 px-6">
                  Explore modules
                </a>
              </div>

              {/* Mini-trust */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-zinc-500 dark:text-zinc-500 lg:justify-start">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2
                    size={14}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                  No credit card
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2
                    size={14}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                  14-day Pro trial
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2
                    size={14}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                  SOC 2 ready
                </span>
              </div>
            </div>

            {/* ── Right: product mockup ────────── */}
            <div className="relative lg:pl-4">
              <ProductMockup />
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="relative border-y border-zinc-200/80 bg-white/50 py-8 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/50">
          <div className="container-page">
            <p className="mb-5 text-center text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
              Trusted by ambitious teams
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
              {TRUSTED_BY.map((name) => (
                <div
                  key={name}
                  className="text-center text-sm font-semibold tracking-tight text-zinc-400 dark:text-zinc-600"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          MODULES
      ═══════════════════════════════════════════════════ */}
      <section id="modules" className="relative overflow-hidden py-24 sm:py-28">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="section-eyebrow">Platform</p>

            <h2 className="mt-3 h-display-sm text-zinc-900 dark:text-zinc-50">
              Operational modules for
              <br />
              <span className="text-gradient-subtle">
                intelligent orchestration.
              </span>
            </h2>

            <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              Synapse modules are designed as operational building blocks —
              connected, observable, and execution-ready from day one.
            </p>
          </div>

          {/* Horizontal operational rail */}
          <ModulesRail />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FEATURES GRID
      ═══════════════════════════════════════════════════ */}
      <section
        id="features"
        className="relative border-y border-zinc-200/80 bg-zinc-50/60 py-24 dark:border-zinc-800/80 dark:bg-zinc-900/40"
      >
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="section-eyebrow">Why Synapse</p>
            <h2 className="mt-3 h-display-sm">
              Built for production,
              <br />
              from the first message.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              Most AI tools stop at the demo. Synapse ships the
              boring-but-essential infrastructure you need to run agents at
              scale.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-200/80 sm:grid-cols-2 lg:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group bg-white p-7 transition-colors hover:bg-zinc-50/60 dark:bg-zinc-900 dark:hover:bg-zinc-900/80"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-950/60 dark:text-brand-400 dark:ring-brand-900/40">
                  <Icon size={18} />
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          USE CASES
      ═══════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-28">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="section-eyebrow">Use cases</p>
            <h2 className="mt-3 h-display-sm">
              From clinics to commerce.
              <br />
              <span className="text-gradient-subtle">All in one stack.</span>
            </h2>
          </div>

          <div className="mt-14 space-y-5">
            {USE_CASES.map(
              ({ icon: Icon, sector, headline, description, bullets }, idx) => (
                <div
                  key={sector}
                  className={
                    "group grid items-center gap-8 rounded-3xl border border-zinc-200/80 bg-white p-8 transition-all hover:shadow-card sm:p-10 lg:grid-cols-[auto_1fr_auto] dark:border-zinc-800 dark:bg-zinc-900 " +
                    (idx % 2 === 1
                      ? "lg:bg-zinc-50/60 dark:lg:bg-zinc-900/60"
                      : "")
                  }
                >
                  {/* Big number / icon */}
                  <div className="flex items-center gap-5">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-soft">
                      <Icon size={26} />
                    </div>
                    <div className="lg:hidden">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                        {sector}
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <div>
                    <p className="hidden text-[11px] font-semibold uppercase tracking-widest text-brand-600 lg:block dark:text-brand-400">
                      {sector}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">
                      {headline}
                    </h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {bullets.map((b) => (
                        <span
                          key={b}
                          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          <Check size={11} className="text-brand-500" />
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="hidden text-zinc-300 transition-colors group-hover:text-brand-500 lg:block dark:text-zinc-700 dark:group-hover:text-brand-400">
                    <ArrowUpRight size={28} />
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          TESTIMONIAL
      ═══════════════════════════════════════════════════ */}
      <section className="border-y border-zinc-200/80 bg-zinc-950 py-24 text-white dark:border-zinc-800/80">
        <div className="container-page">
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex justify-center gap-1 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={18} fill="currentColor" />
              ))}
            </div>
            <blockquote className="mt-6 text-balance text-2xl font-medium leading-snug tracking-tight text-zinc-100 sm:text-3xl">
              &ldquo;We replaced two SaaS tools and 600 lines of glue code with
              a single Synapse workspace. Our agents now respond in under a
              second, with zero infrastructure for our team to maintain.&rdquo;
            </blockquote>
            <div className="mt-8 flex items-center justify-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-base font-bold text-white">
                R
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Renata Costa</p>
                <p className="text-sm text-zinc-400">
                  Head of Operations · Northstar Clinic
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          PRICING
      ═══════════════════════════════════════════════════ */}
      <section id="pricing" className="relative py-24 sm:py-28">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="section-eyebrow">Pricing</p>
            <h2 className="mt-3 h-display-sm">
              Simple, scaling pricing.
              <br />
              <span className="text-gradient-subtle">No surprises.</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              Start free. Upgrade when you outgrow it. Talk to us for
              high-volume needs.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl gap-6 lg:grid-cols-3">
            {PLANS.map(
              ({
                name,
                price,
                period,
                description,
                features,
                cta,
                href,
                highlighted,
              }) => (
                <div
                  key={name}
                  className={
                    "relative flex flex-col rounded-3xl p-8 " +
                    (highlighted
                      ? "gradient-border bg-white shadow-elevated dark:bg-zinc-900"
                      : "border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900")
                  }
                >
                  {highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-600 to-accent-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white shadow-soft">
                        <Sparkles size={11} />
                        Most popular
                      </span>
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      {name}
                    </h3>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span
                        className={
                          "tracking-tight " +
                          (highlighted
                            ? "text-5xl font-bold"
                            : "text-4xl font-bold")
                        }
                      >
                        {price}
                      </span>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {period}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {description}
                    </p>
                  </div>

                  <ul className="my-7 space-y-3 border-y border-zinc-100 py-7 dark:border-zinc-800">
                    {features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <Check
                          size={15}
                          className="mt-0.5 shrink-0 text-brand-500"
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={href}
                    className={
                      "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] " +
                      (highlighted
                        ? "bg-zinc-900 text-white shadow-soft hover:bg-zinc-800 hover:shadow-glow dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                        : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800")
                    }
                  >
                    {cta}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-20 sm:py-24">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 px-8 py-16 sm:px-16 sm:py-20">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-32 -right-20 h-[400px] w-[400px] rounded-full bg-cyan-300/20 blur-3xl" />

            <div className="relative mx-auto max-w-3xl text-center text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                Get started
              </p>
              <h2 className="mt-3 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
                Ship AI conversations that drive revenue.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                Spin up your first agent in minutes. Free for the first 1,000
                messages.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-7 text-sm font-semibold text-brand-700 shadow-elevated transition-all hover:scale-[1.02] hover:bg-zinc-50 active:scale-[0.99]"
                >
                  Start building free
                  <ArrowRight size={15} />
                </Link>
                <a
                  href="mailto:hello@synapse.ai"
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/30 px-7 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  Talk to sales
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════ */}
      <footer className="border-t border-zinc-200/80 bg-white py-16 dark:border-zinc-800/80 dark:bg-zinc-950">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
            {/* Brand */}
            <div>
              <Link href="/" className="flex items-center gap-2.5">
                <Image
                  src="/logo.png"
                  alt="Synapse"
                  width={32}
                  height={32}
                  className="rounded-lg ring-1 ring-black/5 dark:ring-white/10"
                />
                <span className="text-base font-bold tracking-tight">
                  Synapse
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                AI agent orchestration for modern businesses. Built for teams
                who ship.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Product
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a
                    href="#modules"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Modules
                  </a>
                </li>
                <li>
                  <a
                    href="#features"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Changelog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Resources
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    API reference
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Guides
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Status
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Company
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Customers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello@synapse.ai"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Legal
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Privacy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Terms
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    Security
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-zinc-700 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
                  >
                    DPA
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-zinc-200 pt-8 text-xs text-zinc-500 sm:flex-row dark:border-zinc-800 dark:text-zinc-500">
            <p>
              © {new Date().getFullYear()} Synapse Labs. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

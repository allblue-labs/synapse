import Link from 'next/link';
import {ArrowRight, Check, Sparkles} from 'lucide-react';
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Synapse',
  description: 'Simple, scaling pricing for Synapse — Light, Pro, and Premium tiers with usage-based AI.',
};

interface Plan {
  key: 'light' | 'pro' | 'premium';
  name: string;
  price: string;
  period: string;
  description: string;
  features: ReadonlyArray<string>;
  highlighted: boolean;
  cta: string;
  ctaHref: string;
}

const PLANS: ReadonlyArray<Plan> = [
  {
    key: 'light',
    name: 'Light',
    price: 'Free',
    period: 'forever',
    description: 'For small teams getting started with one channel and one agent.',
    features: [
      '1 workspace',
      '1 active channel (WhatsApp / Telegram)',
      '1 active Pulse skill',
      '1,000 messages / month',
      'Community support',
    ],
    highlighted: false,
    cta: 'Start free',
    ctaHref: '/login',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$79',
    period: 'per workspace / month',
    description: 'For growing teams with multiple channels and active operational workflows.',
    features: [
      'Unlimited workspaces',
      'All channels (WhatsApp, Telegram, web)',
      'Up to 10 active skills + playbooks',
      '50,000 messages / month',
      'Knowledge & catalog',
      'Priority email support',
    ],
    highlighted: true,
    cta: 'Start 14-day trial',
    ctaHref: '/login',
  },
  {
    key: 'premium',
    name: 'Premium',
    price: 'Custom',
    period: 'tailored to your scale',
    description: 'For platforms, agencies, and enterprises with high volume and custom needs.',
    features: [
      'Unlimited everything',
      'Custom integrations',
      'Dedicated infrastructure',
      'SAML SSO & SCIM',
      'SOC 2 & DPA',
      '24/7 dedicated support',
    ],
    highlighted: false,
    cta: 'Contact sales',
    ctaHref: 'mailto:hello@synapse.ai',
  },
];

const USAGE_NOTES = [
  'AI calls — token-metered, billed per 1k tokens.',
  'Audio transcription — second-metered, with safe-mode fallbacks.',
  'Workflow runs — counted per executed playbook step.',
  'Storage — billed per GB-month for knowledge contexts and uploads.',
  'Outbound messages — counted per delivered message across all providers.',
];

export default function PricingPage() {
  return (
    <div className="space-y-20">

      {/* ── Header ──────────────────────────────────── */}
      <header className="mx-auto max-w-2xl text-center">
        <p className="section-eyebrow">Pricing</p>
        <h1 className="mt-3 h-display-sm">
          Simple, scaling pricing.<br />
          <span className="text-gradient-subtle">Usage-based AI on top.</span>
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Pick the workspace tier. AI usage (tokens, transcription, workflow steps) is billed transparently on top — never bundled in opaque seats.
        </p>
      </header>

      {/* ── Plans grid ─────────────────────────────── */}
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
        {PLANS.map(({key, name, price, period, description, features, highlighted, cta, ctaHref}) => (
          <div
            key={key}
            className={
              'relative flex flex-col rounded-3xl p-8 ' +
              (highlighted
                ? 'gradient-border bg-white shadow-elevated dark:bg-zinc-900'
                : 'border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900')
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

            <h3 className="text-base font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              {name}
            </h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className={'tracking-tight ' + (highlighted ? 'text-5xl font-bold' : 'text-4xl font-bold')}>
                {price}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{period}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>

            <ul className="my-7 space-y-3 border-y border-zinc-100 py-7 dark:border-zinc-800">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                  <Check size={15} className="mt-0.5 shrink-0 text-brand-500" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={ctaHref}
              className={
                'inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] ' +
                (highlighted
                  ? 'bg-zinc-900 text-white shadow-soft hover:bg-zinc-800 hover:shadow-glow dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100'
                  : 'border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800')
              }
            >
              {cta}
              <ArrowRight size={14} />
            </Link>
          </div>
        ))}
      </section>

      {/* ── Usage notes ────────────────────────────── */}
      <section className="mx-auto max-w-3xl">
        <h2 className="text-center text-lg font-semibold tracking-tight">
          Usage-based AI, transparent metering
        </h2>
        <p className="mt-3 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Every AI call is metered and visible to you in real time — no surprise overages.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {USAGE_NOTES.map((n) => (
            <li
              key={n}
              className="flex items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <Check size={15} className="mt-0.5 shrink-0 text-brand-500" />
              {n}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

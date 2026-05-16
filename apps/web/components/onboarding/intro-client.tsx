'use client';

import Link from 'next/link';
import {ArrowRight, Check, Compass, Sparkles, Timer} from 'lucide-react';
import {useTranslator} from '@/components/providers/locale-provider';

/**
 * IntroClient — Step 1 of the Tenant Context Profile onboarding.
 *
 *   - Immersive welcome screen. Asymmetric (left copy + right ambient
 *     illustration). Single CTA.
 *   - The path the CTA points to is computed server-side from existing
 *     draft state, so a returning user lands on the right step.
 */
export function ProfileIntroClient({resumePath}: {resumePath: string}) {
  const t = useTranslator();

  return (
    <section className="relative flex flex-1 items-center">
      <div className="container-shell grid w-full gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
        {/* LEFT — copy */}
        <div className="animate-slide-up">
          <p className="section-eyebrow flex items-center gap-2">
            <Sparkles size={11} />
            {t('onboarding.eyebrow')}
          </p>
          <h1 className="t-h1 mt-3 max-w-2xl text-[clamp(2rem,4.4vw,3.5rem)] leading-[1.04] tracking-[-0.035em]">
            {t('onboarding.intro.title')}
          </h1>
          <p className="t-body mt-5 max-w-xl text-base leading-relaxed">
            {t('onboarding.intro.summary')}
          </p>

          <ul className="mt-7 max-w-md space-y-3">
            {[
              {icon: Timer,   key: 'onboarding.intro.bullet1'},
              {icon: Compass, key: 'onboarding.intro.bullet2'},
              {icon: Check,   key: 'onboarding.intro.bullet3'},
            ].map(({icon: Icon, key}) => (
              <li key={key} className="flex items-center gap-3 text-[13px] text-zinc-700 dark:text-zinc-300">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200/55 bg-white/65 text-zinc-500 dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:text-zinc-400">
                  <Icon size={12} />
                </span>
                {t(key as Parameters<typeof t>[0])}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={resumePath} className="btn-primary h-11 px-5 text-sm">
              {t('onboarding.intro.cta')}
              <ArrowRight size={14} />
            </Link>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
              {t('onboarding.intro.legal')}
            </p>
          </div>
        </div>

        {/* RIGHT — visual cue. No charts, no fake content; just an
            ambient surface signalling "guided setup". */}
        <div className="animate-panel-in relative hidden h-[460px] lg:block">
          <div className="surface-floating absolute inset-0 overflow-hidden">
            <div className="pointer-events-none absolute -right-20 -top-20 h-[320px] w-[320px] rounded-full bg-brand-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 bottom-[-4rem] h-[280px] w-[280px] rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-50" />

            {/* Layered preview cards — purely decorative, do not render data. */}
            <div className="relative flex h-full flex-col justify-between p-8">
              <div className="surface-dock w-[78%] animate-slide-in-right p-4">
                <p className="section-eyebrow">{t('onboarding.sections.business')}</p>
                <p className="t-h3 mt-1">{t('onboarding.intro.title')}</p>
              </div>
              <div className="surface-dock ml-auto w-[68%] animate-slide-in-right p-4" style={{animationDelay: '80ms'} as React.CSSProperties}>
                <p className="section-eyebrow">{t('onboarding.sections.communication')}</p>
                <p className="t-small mt-1">{t('onboarding.intro.bullet1')}</p>
              </div>
              <div className="surface-dock w-[72%] animate-slide-in-right p-4" style={{animationDelay: '160ms'} as React.CSSProperties}>
                <p className="section-eyebrow">{t('onboarding.sections.operational')}</p>
                <p className="t-small mt-1">{t('onboarding.intro.bullet3')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

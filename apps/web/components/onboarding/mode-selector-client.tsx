'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRight, Bot, ClipboardList, Sparkles} from 'lucide-react';
import {startProfile} from '@/lib/onboarding/actions';
import {Spinner} from '@/components/ui/spinner';
import {StatusPill} from '@/components/ui/status-pill';
import {useToast} from '@/components/ui/toast';
import {useTranslator} from '@/components/providers/locale-provider';
import {cn} from '@/lib/utils';

/**
 * ModeSelectorClient — Step 2.
 *
 *   - Large interactive option panels (NOT radio buttons).
 *   - Continue calls `startProfile(mode)` server action; on success the
 *     router pushes the appropriate next step (`session/[id]` for the
 *     interview, `manual` for the form).
 */

type Mode = 'LLM' | 'MANUAL_FORM';

export function ModeSelectorClient() {
  const router = useRouter();
  const t = useTranslator();
  const {toast} = useToast();
  const [mode, setMode] = useState<Mode>('LLM');
  const [pending, startTransition] = useTransition();

  function handleContinue() {
    startTransition(async () => {
      const result = await startProfile(mode);
      if (result.kind === 'ok') {
        if (mode === 'LLM') {
          router.push(`/onboarding/profile/session/${result.data.id}`);
        } else {
          router.push('/onboarding/profile/manual');
        }
        return;
      }
      if (result.kind === 'forbidden') {
        toast({variant: 'forbidden', title: t('onboarding.errors.forbidden'), description: result.message});
        return;
      }
      toast({variant: 'error', title: t('onboarding.errors.generic'), description: result.message});
    });
  }

  return (
    <section className="relative flex flex-1 items-center">
      <div className="container-shell w-full">
        <div className="mx-auto max-w-3xl animate-slide-up">
          <p className="section-eyebrow flex items-center gap-2">
            <Sparkles size={11} />
            {t('onboarding.eyebrow')}
          </p>
          <h1 className="t-h1 mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08]">
            {t('onboarding.mode.title')}
          </h1>
          <p className="t-body mt-3 max-w-xl">{t('onboarding.mode.summary')}</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <OptionPanel
            id="LLM"
            active={mode === 'LLM'}
            onSelect={() => setMode('LLM')}
            icon={Bot}
            tone="brand"
            title={t('onboarding.mode.interview.label')}
            description={t('onboarding.mode.interview.body')}
            effort={t('onboarding.mode.interview.effort')}
            hint={t('onboarding.mode.interview.hint')}
          />
          <OptionPanel
            id="MANUAL_FORM"
            active={mode === 'MANUAL_FORM'}
            onSelect={() => setMode('MANUAL_FORM')}
            icon={ClipboardList}
            tone="indigo"
            title={t('onboarding.mode.manual.label')}
            description={t('onboarding.mode.manual.body')}
            effort={t('onboarding.mode.manual.effort')}
          />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={pending}
            className="btn-primary h-11 px-5 text-sm"
          >
            {pending ? <Spinner size={13} className="text-current" /> : null}
            {t('onboarding.mode.continue')}
            {!pending && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Option panel ────────────────────────────────────────────────────

interface OptionPanelProps {
  id: Mode;
  active: boolean;
  onSelect: () => void;
  icon: React.ComponentType<{size?: number}>;
  tone: 'brand' | 'indigo';
  title: string;
  description: string;
  effort: string;
  hint?: string;
}

const PANEL_TONE: Record<'brand' | 'indigo', {iconBg: string; ring: string; activeBorder: string; activeBg: string}> = {
  brand: {
    iconBg:       'bg-brand-500/15 text-brand-700 dark:text-brand-300',
    ring:         'ring-brand-200/55 dark:ring-brand-800/55',
    activeBorder: 'border-brand-300/70 dark:border-brand-700/70',
    activeBg:     'from-brand-500/12 via-brand-500/4 to-transparent',
  },
  indigo: {
    iconBg:       'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
    ring:         'ring-indigo-200/55 dark:ring-indigo-800/55',
    activeBorder: 'border-indigo-300/70 dark:border-indigo-700/70',
    activeBg:     'from-indigo-500/12 via-indigo-500/4 to-transparent',
  },
};

function OptionPanel({active, onSelect, icon: Icon, tone, title, description, effort, hint}: OptionPanelProps) {
  const t = PANEL_TONE[tone];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active ? 'true' : 'false'}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white/65 p-6 text-left backdrop-blur-xl shadow-glass transition-all duration-200 ease-snap',
        'hover:-translate-y-[2px] hover:shadow-card',
        'dark:bg-zinc-900/55 dark:shadow-glass-dark',
        active
          ? `${t.activeBorder} ring-2 ${t.ring}`
          : 'border-zinc-200/55 dark:border-zinc-800/55',
      )}
    >
      <div className={cn(
        'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300',
        t.activeBg,
        active && 'opacity-100',
      )} />

      <header className="relative flex items-start justify-between">
        <span className={cn('flex h-12 w-12 items-center justify-center rounded-xl ring-2', t.iconBg, t.ring)}>
          <Icon size={20} />
        </span>
        {hint && <StatusPill tone="emerald" label={hint} pulse />}
      </header>

      <div className="relative mt-5 flex-1">
        <h3 className="t-h3 text-base">{title}</h3>
        <p className="t-body mt-2 text-[13px]">{description}</p>
      </div>

      <p className="relative mt-5 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-500">
        <span className="inline-block h-1 w-1 rounded-full bg-zinc-400" />
        {effort}
      </p>
    </button>
  );
}

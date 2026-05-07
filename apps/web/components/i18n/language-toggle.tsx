'use client';

import {useEffect, useState} from 'react';
import {Languages, Check} from 'lucide-react';
import {useLocale} from '@/components/providers/locale-provider';
import {SUPPORTED_LOCALES, type LocalePreference} from '@/lib/i18n/types';
import {cn} from '@/lib/utils';

/**
 * Language switcher — three options (System / English / Português).
 * UX mirrors the theme toggle exactly: small icon-only trigger, dropdown
 * panel, active option highlighted with a checkmark.
 *
 * Renders a placeholder of the same dimensions before mount so server
 * and client first paint stay identical (no hydration mismatch).
 */
export function LanguageToggle() {
  const {preference, setPreference, t} = useLocale();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;

  const options: ReadonlyArray<{value: LocalePreference; label: string}> = [
    {value: 'system', label: t('language.system')},
    ...SUPPORTED_LOCALES.map((l) => ({
      value: l as LocalePreference,
      label: t(`language.${l}` as 'language.en' | 'language.pt-br'),
    })),
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label={t('language.label')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Languages size={15} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label={t('language.label')}
            className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white/95 shadow-card backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95"
          >
            <div className="border-b border-zinc-100 px-3.5 py-2 dark:border-zinc-800">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {t('language.label')}
              </p>
            </div>
            {options.map((opt) => {
              const active = preference === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setPreference(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2.5 px-3.5 py-2.5 text-sm transition-colors',
                    active
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                      : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800',
                  )}
                >
                  <span>{opt.label}</span>
                  {active && <Check size={13} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

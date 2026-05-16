'use client';

import {useCallback, useEffect, useMemo, useRef, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft, ArrowRight, CheckCircle2, Plus, ShieldAlert, X} from 'lucide-react';
import {SectionProgressTimeline} from '@/components/onboarding/section-progress';
import {Spinner} from '@/components/ui/spinner';
import {StatusPill} from '@/components/ui/status-pill';
import {useToast} from '@/components/ui/toast';
import {useTranslator} from '@/components/providers/locale-provider';
import {submitManualForm} from '@/lib/onboarding/actions';
import {SECTIONS, type SectionId, computeSectionProgress, completedFieldCount, TOTAL_REQUIRED} from '@/lib/onboarding/sections';
import {readDraft, writeDraft, mergeDrafts} from '@/lib/onboarding/storage';
import {useCurrentUser} from '@/components/auth/can';
import type {TenantContextManualFormBody, TenantContextRequiredField} from '@/lib/api';
import type {Messages} from '@/lib/i18n/messages';
import {cn} from '@/lib/utils';

/**
 * ManualFormClient — Step 4 — section-based wizard, NOT a giant form.
 *
 *   - Same layout pattern as the interview (timeline left, surface right)
 *     so the operator never relearns where they are in the flow.
 *   - One section is active at a time; navigation is via Prev/Next.
 *     Each input writes to local state + localStorage; the backend save
 *     happens on `submit` via `submitManualForm`.
 *   - Required vs optional fields are surfaced via inline copy, never
 *     via giant red asterisks.
 */

interface ManualFormProps {
  initialAnswers: Record<string, unknown>;
}

type FieldKey = TenantContextRequiredField | 'website' | 'socialMedia' | 'notes';
type FieldKind = 'text' | 'textarea' | 'list';

interface FieldDef {
  key: FieldKey;
  kind: FieldKind;
  required: boolean;
  labelKey: keyof Messages['onboarding']['manual']['fields'];
  placeholderKey: keyof Messages['onboarding']['manual']['placeholders'];
}

const FIELDS_BY_SECTION: Record<SectionId, ReadonlyArray<FieldDef>> = {
  business: [
    {key: 'businessName',        kind: 'text',     required: true,  labelKey: 'businessName',        placeholderKey: 'businessName'},
    {key: 'businessType',        kind: 'text',     required: true,  labelKey: 'businessType',        placeholderKey: 'businessType'},
    {key: 'businessDescription', kind: 'textarea', required: true,  labelKey: 'businessDescription', placeholderKey: 'businessDescription'},
    {key: 'productsServices',    kind: 'list',     required: true,  labelKey: 'productsServices',    placeholderKey: 'productsServices'},
    {key: 'targetAudience',      kind: 'text',     required: true,  labelKey: 'targetAudience',      placeholderKey: 'targetAudience'},
    {key: 'website',             kind: 'text',     required: false, labelKey: 'website',             placeholderKey: 'website'},
    {key: 'socialMedia',         kind: 'list',     required: false, labelKey: 'socialMedia',         placeholderKey: 'socialMedia'},
    {key: 'notes',               kind: 'textarea', required: false, labelKey: 'notes',               placeholderKey: 'notes'},
  ],
  communication: [
    {key: 'communicationTone',   kind: 'textarea', required: true,  labelKey: 'communicationTone',   placeholderKey: 'communicationTone'},
    {key: 'preferredLanguages',  kind: 'list',     required: true,  labelKey: 'preferredLanguages',  placeholderKey: 'preferredLanguages'},
  ],
  operational: [
    {key: 'customerSupportStyle',kind: 'textarea', required: true,  labelKey: 'customerSupportStyle',placeholderKey: 'customerSupportStyle'},
    {key: 'salesBehavior',       kind: 'textarea', required: true,  labelKey: 'salesBehavior',       placeholderKey: 'salesBehavior'},
    {key: 'generalGoals',        kind: 'list',     required: true,  labelKey: 'generalGoals',        placeholderKey: 'generalGoals'},
  ],
};

export function ManualFormClient({initialAnswers}: ManualFormProps) {
  const router = useRouter();
  const t = useTranslator();
  const {toast} = useToast();
  const user = useCurrentUser();
  const tenantId = user?.tenant?.id ?? '__no-tenant__';

  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [active, setActive] = useState<SectionId>(() => {
    // Resume at the first incomplete section.
    const progress = computeSectionProgress(initialAnswers);
    return progress.find((p) => !p.complete)?.id ?? SECTIONS[0].id;
  });
  const [pending, startTransition] = useTransition();
  const [autosaveAt, setAutosaveAt] = useState<string | null>(null);
  const autosaveTimer = useRef<number | null>(null);

  // ─── Hydrate from localStorage ────────────────────────────────────
  useEffect(() => {
    const local = readDraft(tenantId);
    if (!local) return;
    setAnswers((prev) => mergeDrafts(prev, local.answers));
    if (local.manualStep && SECTIONS.some((s) => s.id === local.manualStep)) {
      setActive(local.manualStep as SectionId);
    }
  }, [tenantId]);

  // ─── Autosave (debounced, local only) ─────────────────────────────
  useEffect(() => {
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      writeDraft(tenantId, {answers, mode: 'MANUAL_FORM', manualStep: active});
      setAutosaveAt(new Date().toISOString());
    }, 500);
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [answers, active, tenantId]);

  const sectionProgress = useMemo(() => computeSectionProgress(answers), [answers]);
  const completed = completedFieldCount(answers);
  const allRequiredDone = completed >= TOTAL_REQUIRED;
  const sectionIndex = SECTIONS.findIndex((s) => s.id === active);
  const isFirst = sectionIndex === 0;
  const isLast  = sectionIndex === SECTIONS.length - 1;

  const setField = useCallback((key: FieldKey, value: unknown) => {
    setAnswers((prev) => ({...prev, [key]: value}));
  }, []);

  const goPrev = useCallback(() => {
    if (!isFirst) setActive(SECTIONS[sectionIndex - 1].id);
  }, [isFirst, sectionIndex]);

  const goNext = useCallback(() => {
    if (!isLast) setActive(SECTIONS[sectionIndex + 1].id);
  }, [isLast, sectionIndex]);

  function submit() {
    // Build a fully-shaped manual body. Missing fields will fail backend
    // validation; we still send so the operator sees the same error
    // surface for partially-completed submissions.
    const body: TenantContextManualFormBody = {
      businessName:         readString(answers.businessName),
      businessType:         readString(answers.businessType),
      businessDescription:  readString(answers.businessDescription),
      productsServices:     readList(answers.productsServices),
      targetAudience:       readString(answers.targetAudience),
      communicationTone:    readString(answers.communicationTone),
      preferredLanguages:   readList(answers.preferredLanguages),
      customerSupportStyle: readString(answers.customerSupportStyle),
      salesBehavior:        readString(answers.salesBehavior),
      generalGoals:         readList(answers.generalGoals),
      website:              readOptionalString(answers.website),
      socialMedia:          readList(answers.socialMedia),
      notes:                readOptionalString(answers.notes),
    };

    startTransition(async () => {
      const result = await submitManualForm(body);
      if (result.kind === 'ok') {
        router.push('/onboarding/profile/validation');
        return;
      }
      if (result.kind === 'forbidden') {
        toast({variant: 'forbidden', title: t('onboarding.errors.forbidden'), description: result.message});
        return;
      }
      if (result.kind === 'invalid') {
        toast({variant: 'error', title: t('onboarding.errors.generic'), description: result.message});
        return;
      }
      toast({variant: 'error', title: t('onboarding.errors.generic'), description: result.message});
    });
  }

  return (
    <section className="relative flex flex-1 flex-col">
      <div className="grid w-full flex-1 gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <SectionProgressTimeline
          progress={sectionProgress}
          activeSection={active}
          className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-7rem)]"
        />

        <div className="relative flex h-[calc(100vh-9rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-zinc-200/55 bg-white/65 shadow-glass backdrop-blur-xl dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:shadow-glass-dark">
          <header className="flex items-start justify-between gap-4 border-b border-zinc-200/55 px-6 py-4 dark:border-zinc-800/55">
            <div>
              <p className="section-eyebrow">{t('onboarding.eyebrow')}</p>
              <h2 className="t-h3 mt-1">{t(`onboarding.sections.${SECTIONS[sectionIndex].labelKey}`)}</h2>
              <p className="t-small mt-1">{t('onboarding.manual.hint')}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusPill tone="indigo" label={`${completed}/${TOTAL_REQUIRED}`} />
              <StatusPill tone="zinc" label={t('onboarding.progress.stepOf').replace('{n}', String(sectionIndex + 1)).replace('{total}', String(SECTIONS.length))} />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-2xl space-y-5">
              {FIELDS_BY_SECTION[active].map((f) => (
                <Field
                  key={f.key}
                  field={f}
                  value={answers[f.key]}
                  onChange={(v) => setField(f.key, v)}
                />
              ))}
            </div>
          </div>

          <footer className="border-t border-zinc-200/55 bg-zinc-50/30 px-6 py-4 dark:border-zinc-800/55 dark:bg-zinc-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                {autosaveAt ? (
                  <>
                    <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                    {t('onboarding.manual.autosaveSaved').replace('{when}', formatTime(autosaveAt))}
                  </>
                ) : (
                  <>
                    <ShieldAlert size={11} />
                    {t('onboarding.manual.hint')}
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={isFirst}
                className="btn-ghost h-10 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft size={12} />
                {t('onboarding.manual.prev')}
              </button>
              <div className="flex items-center gap-2">
                {isLast ? (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={pending || !allRequiredDone}
                    className="btn-primary h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending ? <Spinner size={13} className="text-current" /> : null}
                    {t('onboarding.manual.submit')}
                    {!pending && <ArrowRight size={13} />}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    className="btn-primary h-10 px-4 text-sm"
                  >
                    {t('onboarding.manual.next')}
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}

// ─── Field components ────────────────────────────────────────────────

interface FieldProps {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}

function Field({field, value, onChange}: FieldProps) {
  const t = useTranslator();
  const label = t(`onboarding.manual.fields.${field.labelKey}` as Parameters<typeof t>[0]);
  const placeholder = t(`onboarding.manual.placeholders.${field.placeholderKey}` as Parameters<typeof t>[0]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-700 dark:text-zinc-300" htmlFor={field.key}>
          {label}
        </label>
        <span className={cn(
          'text-[10px] font-semibold uppercase tracking-[0.14em]',
          field.required ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-400 dark:text-zinc-600',
        )}>
          {field.required ? t('onboarding.manual.requiredHint') : t('onboarding.manual.optionalHint')}
        </span>
      </div>

      {field.kind === 'text' && (
        <input
          id={field.key}
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-zinc-200/55 bg-white/85 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800/55 dark:bg-zinc-900/65 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
      )}

      {field.kind === 'textarea' && (
        <textarea
          id={field.key}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="min-h-[88px] w-full resize-y rounded-lg border border-zinc-200/55 bg-white/85 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800/55 dark:bg-zinc-900/65 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
      )}

      {field.kind === 'list' && (
        <ListInput value={readList(value)} onChange={onChange} placeholder={placeholder} />
      )}
    </div>
  );
}

function ListInput({value, onChange, placeholder}: {value: string[]; onChange: (v: string[]) => void; placeholder: string}) {
  const t = useTranslator();
  const [draft, setDraft] = useState('');

  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft('');
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-zinc-200/55 bg-white/85 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800/55 dark:bg-zinc-900/65 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-zinc-200/55 bg-white/65 px-3 text-xs font-semibold text-zinc-700 shadow-soft transition-soft hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <Plus size={12} />
          {t('onboarding.manual.addItem')}
        </button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((item, idx) => (
            <li
              key={`${item}-${idx}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200/55 bg-white/65 px-2 py-1 text-[12px] font-medium text-zinc-800 dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:text-zinc-200"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label={t('onboarding.manual.removeItem')}
                className="text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
              >
                <X size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Read helpers ────────────────────────────────────────────────────

function readString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function readOptionalString(v: unknown): string | undefined {
  const s = readString(v);
  return s.length === 0 ? undefined : s;
}

function readList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  } catch {
    return '';
  }
}

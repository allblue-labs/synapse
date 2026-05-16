'use client';

import {useCallback, useEffect, useMemo, useRef, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRight, Bot, CheckCircle2, ClipboardList, Mic, Send, ShieldAlert, Sparkles, UserCircle2} from 'lucide-react';
import {SectionProgressTimeline} from '@/components/onboarding/section-progress';
import {StatusPill} from '@/components/ui/status-pill';
import {Spinner} from '@/components/ui/spinner';
import {useToast} from '@/components/ui/toast';
import {useTranslator} from '@/components/providers/locale-provider';
import {saveAnswer} from '@/lib/onboarding/actions';
import {computeSectionProgress, sectionForField, completedFieldCount, TOTAL_REQUIRED} from '@/lib/onboarding/sections';
import {readDraft, writeDraft, mergeDrafts} from '@/lib/onboarding/storage';
import {useCurrentUser} from '@/components/auth/can';
import type {TenantContextRequiredField} from '@/lib/api';

/**
 * InterviewClient — Step 3.
 *
 * Two-column fullscreen layout:
 *
 *   LEFT (sticky, ~320 px): progress timeline with section completion.
 *   RIGHT: conversation surface with question block + answered turns.
 *
 * Not a chatbot:
 *   - Each "turn" is a structured pair (question block on top, answer
 *     block below). No bubbles, no typing dots, no chat header.
 *   - The pending question lives at the top of the surface; the input
 *     stays anchored at the bottom.
 *   - Audio upload is a button placeholder until the transcription
 *     backend ships.
 *
 * Resumability:
 *   - On mount, merges any local-storage draft with server answers so an
 *     accidental refresh doesn't lose unsubmitted text.
 *   - After every successful save, replaces the local copy.
 */

interface NextQuestion {
  key: string | null;
  question: string | null;
}

interface Turn {
  key: TenantContextRequiredField;
  question: string;
  answer: string;
}

interface InterviewClientProps {
  sessionId: string;
  initialAnswers: Record<string, unknown>;
  initialNextQuestion: NextQuestion | null;
}

export function InterviewClient({sessionId, initialAnswers, initialNextQuestion}: InterviewClientProps) {
  const router = useRouter();
  const t = useTranslator();
  const {toast} = useToast();
  const user = useCurrentUser();
  const tenantId = user?.tenant?.id ?? '__no-tenant__';

  // Hydrated state — start with the server answers; client effect then
  // merges in any pending local-storage draft.
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [nextQuestion, setNextQuestion] = useState<NextQuestion | null>(initialNextQuestion);
  const [inputValue, setInputValue] = useState('');
  const [pending, startTransition] = useTransition();
  const [autosaveAt, setAutosaveAt] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ─── Hydrate from localStorage (interruption recovery) ────────────
  useEffect(() => {
    const local = readDraft(tenantId);
    if (!local) return;
    setAnswers((prev) => mergeDrafts(prev, local.answers));
  }, [tenantId]);

  // ─── Online/offline awareness ─────────────────────────────────────
  useEffect(() => {
    function up() { setOnline(true); }
    function down() { setOnline(false); }
    setOnline(typeof navigator === 'undefined' || navigator.onLine);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // ─── Derived state ────────────────────────────────────────────────
  const sectionProgress = useMemo(() => computeSectionProgress(answers), [answers]);
  const completed = useMemo(() => completedFieldCount(answers), [answers]);
  const activeSection = nextQuestion?.key
    ? sectionForField(nextQuestion.key as TenantContextRequiredField)
    : null;

  // Build the answered turns timeline from the answers map. Field order
  // follows the canonical required field list.
  const turns = useMemo<Turn[]>(() => {
    const out: Turn[] = [];
    for (const [k, v] of Object.entries(answers)) {
      if (typeof v !== 'string' && !Array.isArray(v)) continue;
      const text = Array.isArray(v) ? v.filter(Boolean).join(', ') : v;
      if (!text) continue;
      out.push({
        key: k as TenantContextRequiredField,
        question: QUESTION_FALLBACK[k] ?? k,
        answer: text,
      });
    }
    return out;
  }, [answers]);

  const isComplete = completed >= TOTAL_REQUIRED;

  // ─── Submit answer ────────────────────────────────────────────────
  const submit = useCallback(() => {
    const value = inputValue.trim();
    if (!value || !nextQuestion?.key) return;
    const key = nextQuestion.key;

    // Optimistic local update for interruption recovery.
    const optimisticAnswers = isListField(key)
      ? {...answers, [key]: splitList(value)}
      : {...answers, [key]: value};
    setAnswers(optimisticAnswers);
    writeDraft(tenantId, {answers: optimisticAnswers, mode: 'LLM'});

    startTransition(async () => {
      const result = await saveAnswer({
        questionKey: key,
        answer: isListField(key) ? splitList(value) : value,
        mode: 'LLM',
      });
      if (result.kind === 'ok') {
        const draft = result.data;
        setAnswers(draft.answers);
        setNextQuestion(draft.nextQuestion ?? null);
        setInputValue('');
        setAutosaveAt(draft.updatedAt ?? new Date().toISOString());
        writeDraft(tenantId, {answers: draft.answers, mode: 'LLM'});
        // Refocus the input for the next question.
        window.setTimeout(() => inputRef.current?.focus(), 0);
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
      // Network / 5xx — keep local copy; user can retry.
      toast({variant: 'error', title: t('onboarding.errors.generic'), description: result.message});
    });
  }, [answers, inputValue, nextQuestion, t, tenantId, toast]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <section className="relative flex flex-1 flex-col">
      <div className="grid w-full flex-1 gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        {/* LEFT — progress */}
        <SectionProgressTimeline
          progress={sectionProgress}
          activeSection={activeSection}
          className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-7rem)]"
        />

        {/* RIGHT — conversation surface */}
        <div className="relative flex h-[calc(100vh-9rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-zinc-200/55 bg-white/65 shadow-glass backdrop-blur-xl dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:shadow-glass-dark">
          <header className="flex items-start justify-between gap-4 border-b border-zinc-200/55 px-6 py-4 dark:border-zinc-800/55">
            <div>
              <p className="section-eyebrow flex items-center gap-2">
                <Sparkles size={11} />
                {t('onboarding.interview.objective')}
              </p>
              <h2 className="t-h3 mt-1">
                {nextQuestion?.question ?? t('onboarding.interview.complete')}
              </h2>
              <p className="t-small mt-1 max-w-2xl">{t('onboarding.interview.hint')}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusPill tone="indigo" label={`${completed}/${TOTAL_REQUIRED}`} />
              {!online && <StatusPill tone="amber" label="Offline" />}
            </div>
          </header>

          {/* Scrollable conversation */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {turns.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-200/55 bg-white/40 p-5 text-[12px] leading-relaxed text-zinc-500 dark:border-zinc-800/55 dark:bg-zinc-900/30 dark:text-zinc-500">
                {t('onboarding.interview.hint')}
              </div>
            )}

            <ol className="space-y-5">
              {turns.map((turn) => (
                <li key={turn.key} className="animate-slide-up space-y-2">
                  <QuestionBlock text={turn.question} />
                  <AnswerBlock text={turn.answer} />
                </li>
              ))}

              {/* Current open question (only when not yet complete). */}
              {!isComplete && nextQuestion?.question && (
                <li className="animate-slide-up">
                  <QuestionBlock text={nextQuestion.question} pending />
                </li>
              )}
            </ol>

            {/* Completion notice. */}
            {isComplete && (
              <div className="surface-translucent surface-hover-brand mt-5 flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={16} />
                  </span>
                  <div>
                    <p className="t-h3">{t('onboarding.interview.complete')}</p>
                    <p className="t-meta-xs">{TOTAL_REQUIRED}/{TOTAL_REQUIRED}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/onboarding/profile/validation')}
                  className="btn-primary h-9 px-3 text-xs"
                >
                  {t('onboarding.interview.reviewCta')}
                  <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Input dock */}
          <footer className="border-t border-zinc-200/55 bg-zinc-50/30 px-6 py-4 dark:border-zinc-800/55 dark:bg-zinc-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                {pending
                  ? <><Spinner size={10} className="text-current" /> {t('onboarding.interview.autosaveSaving')}</>
                  : autosaveAt
                    ? <><CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" /> {t('onboarding.interview.autosaveSaved').replace('{when}', formatTime(autosaveAt))}</>
                    : <><ShieldAlert size={11} /> {t('onboarding.interview.offTopicNotice')}</>}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="font-mono">{sessionId.slice(0, 8)}</span>
                <span>·</span>
                <span>{t('onboarding.interview.hint')}</span>
              </span>
            </div>

            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('onboarding.interview.placeholder')}
                disabled={pending || isComplete || !nextQuestion?.key}
                className="min-h-[64px] flex-1 resize-none rounded-xl border border-zinc-200/55 bg-white/85 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800/55 dark:bg-zinc-900/65 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              <button
                type="button"
                disabled
                title={t('onboarding.interview.audioUpload')}
                aria-label={t('onboarding.interview.audioUpload')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200/55 bg-white/65 text-zinc-500 shadow-soft transition-soft hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:text-zinc-400"
              >
                <Mic size={14} />
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || isComplete || !inputValue.trim() || !nextQuestion?.key}
                className="btn-primary h-11 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? <Spinner size={13} className="text-current" /> : <Send size={13} />}
                {t('onboarding.interview.send')}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.push('/onboarding/profile/manual')}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
              >
                <ClipboardList size={11} />
                {t('onboarding.interview.backToMode')}
              </button>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600">⌘↵ {t('onboarding.interview.send')}</span>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function QuestionBlock({text, pending}: {text: string; pending?: boolean}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-500/15 to-accent-500/15 text-brand-700 ring-1 ring-brand-200/55 dark:text-brand-300 dark:ring-brand-800/55">
        <Bot size={13} />
      </span>
      <div className={`surface-inset min-w-0 max-w-2xl flex-1 px-4 py-3 ${pending ? 'border-brand-200/55 dark:border-brand-800/55' : ''}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
          Synapse
        </p>
        <p className="mt-1 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">{text}</p>
      </div>
    </div>
  );
}

function AnswerBlock({text}: {text: string}) {
  return (
    <div className="flex items-start justify-end gap-3 pl-10">
      <div className="surface-dock min-w-0 max-w-2xl px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">
          You
        </p>
        <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          {text}
        </p>
      </div>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-400">
        <UserCircle2 size={13} />
      </span>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

const LIST_FIELDS: ReadonlyArray<string> = [
  'productsServices',
  'preferredLanguages',
  'socialMedia',
  'generalGoals',
];

function isListField(key: string): boolean {
  return LIST_FIELDS.includes(key);
}

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

const QUESTION_FALLBACK: Record<string, string> = {
  businessName: 'What is the business name?',
  businessType: 'What type of business is this?',
  businessDescription: 'Briefly describe what this business does.',
  productsServices: 'Which products or services does this business offer?',
  targetAudience: 'Who is the target audience?',
  communicationTone: 'What communication tone should the business use?',
  preferredLanguages: 'Which languages should the business prefer?',
  customerSupportStyle: 'How should customer support behave?',
  salesBehavior: 'How should sales conversations behave?',
  generalGoals: 'What are the general operational goals?',
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  } catch {
    return '';
  }
}

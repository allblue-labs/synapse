'use client';

import {useMemo, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronDown, Pencil, RefreshCw, ShieldAlert, X} from 'lucide-react';
import {SectionProgressTimeline} from '@/components/onboarding/section-progress';
import {Spinner} from '@/components/ui/spinner';
import {StatusPill} from '@/components/ui/status-pill';
import {useToast} from '@/components/ui/toast';
import {useTranslator} from '@/components/providers/locale-provider';
import {approveProfile, generateSummary, rejectProfile} from '@/lib/onboarding/actions';
import {computeSectionProgress} from '@/lib/onboarding/sections';
import {clearDraft} from '@/lib/onboarding/storage';
import {useCurrentUser} from '@/components/auth/can';
import type {TenantContextBusiness, TenantContextCommunication, TenantContextOperational, TenantProfileSummary, TenantContextDraftSummary} from '@/lib/api';
import {cn} from '@/lib/utils';

/**
 * ValidationClient — Step 5 — review + approve.
 *
 *   - Reads the freshest summary from the page (server pre-generated it).
 *   - Sections collapse / expand for scanning. Editing a section sends the
 *     operator back to the right step in the manual form so they can
 *     correct it; the existing draft is preserved.
 *   - Approve → success transition → workspace.
 *   - Reject → optional reason → flow returns to drafting.
 */

interface ValidationClientProps {
  summary: TenantProfileSummary | null;
  fallback: TenantContextDraftSummary | null;
  initialAnswers: Record<string, unknown>;
}

export function ValidationClient({summary, fallback, initialAnswers}: ValidationClientProps) {
  const router = useRouter();
  const t = useTranslator();
  const {toast} = useToast();
  const user = useCurrentUser();
  const tenantId = user?.tenant?.id ?? '__no-tenant__';

  const [current, setCurrent] = useState<TenantProfileSummary | null>(summary);
  const [pending, startTransition] = useTransition();
  const [approved, setApproved] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [openSection, setOpenSection] = useState<'business' | 'communication' | 'operational' | 'notes' | null>('business');

  // Always derive missing-fields from the freshest source.
  const business = current?.business ?? (fallback?.business as TenantContextBusiness | undefined) ?? null;
  const communication = current?.communication ?? (fallback?.communication as TenantContextCommunication | undefined) ?? null;
  const operational = current?.operational ?? (fallback?.operational as TenantContextOperational | undefined) ?? null;
  const missingFields = current?.completeness?.missingFields
    ?? fallback?.completeness?.missingFields
    ?? [];
  const readyForApproval = current?.completeness?.readyForApproval
    ?? fallback?.completeness?.readyForApproval
    ?? false;
  const sectionProgress = useMemo(() => computeSectionProgress(initialAnswers), [initialAnswers]);

  function handleRegenerate() {
    startTransition(async () => {
      const result = await generateSummary();
      if (result.kind === 'ok') {
        setCurrent(result.data);
        toast({variant: 'success', title: t('onboarding.validation.regenerate')});
        return;
      }
      toast({variant: 'error', title: t('onboarding.errors.generic'), description: result.message});
    });
  }

  function handleEdit(section: 'business' | 'communication' | 'operational') {
    // Send the operator back to the manual form. The page resumes at the
    // first incomplete section by default; that's fine for editing too.
    router.push('/onboarding/profile/manual');
    void section;
  }

  function handleApprove() {
    startTransition(async () => {
      const result = await approveProfile();
      if (result.kind === 'ok') {
        clearDraft(tenantId);
        setApproved(true);
        // Let the success transition breathe, then redirect.
        window.setTimeout(() => {
          router.push('/workspace/overview');
        }, 1400);
        return;
      }
      if (result.kind === 'forbidden') {
        toast({variant: 'forbidden', title: t('onboarding.errors.forbidden'), description: result.message});
        return;
      }
      if (result.kind === 'invalid') {
        toast({variant: 'error', title: t('onboarding.validation.missingFields'), description: result.message});
        return;
      }
      toast({variant: 'error', title: t('onboarding.errors.generic'), description: result.message});
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectProfile(rejectReason.trim() || undefined);
      if (result.kind === 'ok') {
        toast({variant: 'info', title: t('onboarding.validation.reject')});
        router.push('/onboarding/profile/manual');
        return;
      }
      toast({variant: 'error', title: t('onboarding.errors.generic'), description: result.message});
    });
  }

  // ─── Success transition ───────────────────────────────────────────
  if (approved) {
    return (
      <section className="relative flex flex-1 items-center justify-center">
        <div className="animate-panel-in surface-translucent w-full max-w-md p-10 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={28} />
          </span>
          <h1 className="t-h1 mt-6 text-[1.5rem]">{t('onboarding.validation.approved')}</h1>
          <p className="t-body mt-3">{t('onboarding.validation.redirect')}</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
            <Spinner size={12} className="text-current" />
            <span>{t('onboarding.validation.approving')}</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex flex-1 flex-col">
      <div className="grid w-full flex-1 gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <SectionProgressTimeline
          progress={sectionProgress}
          activeSection={null}
          className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-7rem)]"
        />

        <div className="relative flex h-[calc(100vh-9rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-zinc-200/55 bg-white/65 shadow-glass backdrop-blur-xl dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:shadow-glass-dark">
          <header className="flex items-start justify-between gap-4 border-b border-zinc-200/55 px-6 py-4 dark:border-zinc-800/55">
            <div>
              <p className="section-eyebrow">{t('onboarding.eyebrow')}</p>
              <h2 className="t-h3 mt-1">{t('onboarding.validation.title')}</h2>
              <p className="t-small mt-1 max-w-2xl">{t('onboarding.validation.summary')}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {readyForApproval
                ? <StatusPill tone="emerald" label="Ready" pulse />
                : <StatusPill tone="amber" label="Pending" pulse />}
            </div>
          </header>

          {/* Banner: missing required fields. */}
          {!readyForApproval && missingFields.length > 0 && (
            <div className="mx-6 mt-5 flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/60 p-4 dark:border-amber-800/55 dark:bg-amber-900/20">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">
                  {t('onboarding.validation.missingFields')}
                </p>
                <p className="mt-1 font-mono text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  {missingFields.join(' · ')}
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-3">
              <SummarySection
                id="business"
                title={t('onboarding.validation.sections.business')}
                open={openSection === 'business'}
                onToggle={() => setOpenSection(openSection === 'business' ? null : 'business')}
                onEdit={() => handleEdit('business')}
              >
                {business
                  ? <BusinessView data={business} />
                  : <EmptyHint />}
              </SummarySection>

              <SummarySection
                id="communication"
                title={t('onboarding.validation.sections.communication')}
                open={openSection === 'communication'}
                onToggle={() => setOpenSection(openSection === 'communication' ? null : 'communication')}
                onEdit={() => handleEdit('communication')}
              >
                {communication
                  ? <CommunicationView data={communication} />
                  : <EmptyHint />}
              </SummarySection>

              <SummarySection
                id="operational"
                title={t('onboarding.validation.sections.operational')}
                open={openSection === 'operational'}
                onToggle={() => setOpenSection(openSection === 'operational' ? null : 'operational')}
                onEdit={() => handleEdit('operational')}
              >
                {operational
                  ? <OperationalView data={operational} />
                  : <EmptyHint />}
              </SummarySection>

              {business?.notes && (
                <SummarySection
                  id="notes"
                  title={t('onboarding.validation.sections.notes')}
                  open={openSection === 'notes'}
                  onToggle={() => setOpenSection(openSection === 'notes' ? null : 'notes')}
                  onEdit={() => handleEdit('business')}
                >
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {business.notes}
                  </p>
                </SummarySection>
              )}
            </div>

            {/* Reject reason inline panel. */}
            {showRejectReason && (
              <div className="animate-slide-up mt-5 rounded-xl border border-zinc-200/55 bg-white/45 p-4 dark:border-zinc-800/55 dark:bg-zinc-900/30">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-700 dark:text-zinc-300" htmlFor="reject-reason">
                  {t('onboarding.validation.rejectReason')}
                </label>
                <textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-y rounded-lg border border-zinc-200/55 bg-white/85 px-3 py-2 text-sm text-zinc-900 outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800/55 dark:bg-zinc-900/65 dark:text-zinc-100"
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectReason(false);
                      setRejectReason('');
                    }}
                    disabled={pending}
                    className="btn-ghost h-9 px-3 text-xs"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={pending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200/70 bg-red-50/70 px-3 text-xs font-semibold text-red-700 shadow-soft transition-soft hover:bg-red-50 active:scale-[0.97] dark:border-red-800/55 dark:bg-red-900/25 dark:text-red-300 dark:hover:bg-red-900/40"
                  >
                    {pending ? <Spinner size={11} className="text-current" /> : <ShieldAlert size={11} />}
                    {t('onboarding.validation.reject')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <footer className="border-t border-zinc-200/55 bg-zinc-50/30 px-6 py-4 dark:border-zinc-800/55 dark:bg-zinc-950/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectReason((v) => !v)}
                  disabled={pending}
                  className="btn-ghost h-10 px-3 text-xs"
                >
                  <ShieldAlert size={12} />
                  {t('onboarding.validation.reject')}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={pending}
                  className="btn-ghost h-10 px-3 text-xs"
                >
                  {pending ? <Spinner size={11} className="text-current" /> : <RefreshCw size={12} />}
                  {t('onboarding.validation.regenerate')}
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit('business')}
                  disabled={pending}
                  className="btn-secondary h-10 px-3 text-xs"
                >
                  <Pencil size={12} />
                  {t('onboarding.validation.edit')}
                </button>
              </div>
              <button
                type="button"
                onClick={handleApprove}
                disabled={pending || !readyForApproval}
                className="btn-primary h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? <Spinner size={13} className="text-current" /> : <Check size={13} />}
                {t('onboarding.validation.approve')}
                {!pending && <ArrowRight size={13} />}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}

// ─── Summary section ─────────────────────────────────────────────────

function SummarySection({
  title,
  open,
  onToggle,
  onEdit,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslator();
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/55 bg-white/55 backdrop-blur-xl dark:border-zinc-800/55 dark:bg-zinc-900/45">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left transition-soft"
        >
          <ChevronDown size={13} className={cn('text-zinc-400 transition-transform duration-200 ease-snap', !open && '-rotate-90')} />
          <p className="t-h3 text-[13px]">{title}</p>
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200/55 bg-white/65 px-2 py-1 text-[10px] font-medium text-zinc-600 transition-soft hover:bg-white dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          <Pencil size={9} />
          {t('onboarding.validation.edit')}
        </button>
      </header>
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-snap',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-zinc-200/55 px-4 py-4 dark:border-zinc-800/55">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function BusinessView({data}: {data: TenantContextBusiness}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name"        value={data.businessName} />
      <Field label="Type"        value={data.businessType} />
      <Field label="Description" value={data.businessDescription} full />
      <Field label="Products & services" value={(data.productsServices ?? []).join(', ')} full />
      <Field label="Target audience" value={data.targetAudience} full />
      {data.website && <Field label="Website" value={data.website} />}
      {data.socialMedia && data.socialMedia.length > 0 && (
        <Field label="Social media" value={data.socialMedia.join(', ')} full />
      )}
    </div>
  );
}

function CommunicationView({data}: {data: TenantContextCommunication}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tone"     value={data.communicationTone} full />
      <Field label="Languages" value={(data.preferredLanguages ?? []).join(', ')} />
    </div>
  );
}

function OperationalView({data}: {data: TenantContextOperational}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Customer support" value={data.customerSupportStyle} full />
      <Field label="Sales behaviour"  value={data.salesBehavior} full />
      <Field label="General goals"    value={(data.generalGoals ?? []).join(' · ')} full />
    </div>
  );
}

function Field({label, value, full}: {label: string; value: string; full?: boolean}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
        {value || <span className="text-zinc-400 dark:text-zinc-600">—</span>}
      </p>
    </div>
  );
}

function EmptyHint() {
  return <p className="text-[12px] text-zinc-500 dark:text-zinc-500">No data captured for this section yet.</p>;
}

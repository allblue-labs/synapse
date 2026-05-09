'use client';

import {useMemo, useState, useTransition} from 'react';
import {
  Archive,
  BookOpen,
  Building2,
  Check,
  ClipboardList,
  Megaphone,
  Plus,
  Search,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import {Can} from '@/components/auth/can';
import {Dialog, DialogBody, DialogFooter} from '@/components/ui/dialog';
import {LoadState} from '@/components/ui/load-state';
import {useToast} from '@/components/ui/toast';
import type {PulseKnowledgeContextRecord, PulseKnowledgeContextStatus, PulseKnowledgeContextType} from '@/lib/api';
import {archiveKnowledge, publishKnowledge} from '@/lib/pulse/knowledge-actions';
import type {ActionResult} from '@/lib/pulse/actions';
import {cn} from '@/lib/utils';

/**
 * KnowledgeBoard — interactive surface for the knowledge contexts page.
 *
 *   - Client-side filter chips (type + status).
 *   - Local search input (substring against title/content) — backend
 *     semantic search via `pulse.queryKnowledge` is reserved for a
 *     follow-up batch with a ranking UI.
 *   - Publish / Archive dialogs use the Server Actions in
 *     `lib/pulse/knowledge-actions.ts`. Toast feedback + revalidate.
 */

interface KnowledgeBoardProps {
  rows: ReadonlyArray<PulseKnowledgeContextRecord>;
  facets: {
    total: number;
    active: number;
    archived: number;
    byType: Readonly<Record<PulseKnowledgeContextType, number>>;
  };
  initialStatus: PulseKnowledgeContextStatus;
}

const TYPE_META: Record<PulseKnowledgeContextType, {label: string; icon: LucideIcon; accent: 'sky' | 'violet' | 'amber' | 'emerald' | 'rose'}> = {
  FAQ:                     {label: 'FAQ',           icon: BookOpen,      accent: 'sky'},
  BUSINESS_DESCRIPTION:    {label: 'Business',      icon: Building2,     accent: 'violet'},
  OPERATIONAL_INSTRUCTION: {label: 'Operations',    icon: ClipboardList, accent: 'amber'},
  PRODUCT_SERVICE:         {label: 'Catalog',       icon: Sparkles,      accent: 'emerald'},
  CAMPAIGN_PROMOTION:      {label: 'Campaign',      icon: Megaphone,     accent: 'rose'},
};

const ACCENT: Record<'sky' | 'violet' | 'amber' | 'emerald' | 'rose', {iconBg: string; chip: string}> = {
  sky:     {iconBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',           chip: 'border-sky-200/80 bg-sky-50/80 text-sky-700 dark:border-sky-800/60 dark:bg-sky-900/30 dark:text-sky-300'},
  violet:  {iconBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',  chip: 'border-violet-200/80 bg-violet-50/80 text-violet-700 dark:border-violet-800/60 dark:bg-violet-900/30 dark:text-violet-300'},
  amber:   {iconBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',     chip: 'border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-300'},
  emerald: {iconBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',chip: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-300'},
  rose:    {iconBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',         chip: 'border-rose-200/80 bg-rose-50/80 text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/30 dark:text-rose-300'},
};

const ALL_TYPES: ReadonlyArray<PulseKnowledgeContextType> = [
  'FAQ',
  'BUSINESS_DESCRIPTION',
  'OPERATIONAL_INSTRUCTION',
  'PRODUCT_SERVICE',
  'CAMPAIGN_PROMOTION',
];

export function KnowledgeBoard({rows, facets, initialStatus}: KnowledgeBoardProps) {
  const [typeFilter, setTypeFilter] = useState<PulseKnowledgeContextType | null>(null);
  const [status, setStatus] = useState<PulseKnowledgeContextStatus>(initialStatus);
  const [query, setQuery] = useState('');
  const [openDialog, setOpenDialog] = useState<'publish' | 'archive' | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<PulseKnowledgeContextRecord | null>(null);
  const [pending, startTransition] = useTransition();
  const {toast} = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter && r.type !== typeFilter) return false;
      if (!q) return true;
      return r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q);
    });
  }, [rows, typeFilter, query]);

  function run<T>(action: () => Promise<ActionResult<T>>, successTitle: string) {
    startTransition(async () => {
      const result = await action();
      if (result.kind === 'ok') {
        toast({variant: 'success', title: successTitle});
        setOpenDialog(null);
        setArchiveTarget(null);
        return;
      }
      if (result.kind === 'forbidden') {
        toast({variant: 'forbidden', title: 'Permission denied.', description: result.message});
        return;
      }
      if (result.kind === 'invalid') {
        toast({variant: 'error', title: 'Invalid input.', description: result.message});
        return;
      }
      toast({variant: 'error', title: 'Action failed.', description: result.message});
    });
  }

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────── */}
      <section className="surface-translucent relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200/70 bg-white/70 px-3 py-2 shadow-soft dark:border-zinc-800/70 dark:bg-zinc-900/55">
            <Search size={13} className="text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or body…"
              className="w-56 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-100"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                clear
              </button>
            )}
          </div>

          {/* Status toggle */}
          <div className="inline-flex overflow-hidden rounded-lg border border-zinc-200/70 bg-white/70 shadow-soft dark:border-zinc-800/70 dark:bg-zinc-900/55">
            <StatusButton active={status === 'ACTIVE'}   onClick={() => setStatus('ACTIVE')}   label="Active"   count={facets.active} />
            <StatusButton active={status === 'ARCHIVED'} onClick={() => setStatus('ARCHIVED')} label="Archived" count={facets.archived} />
          </div>

          <div className="flex items-center gap-2">
            <Can permission="pulse:write">
              <button
                type="button"
                onClick={() => setOpenDialog('publish')}
                className="btn-primary h-9 px-3.5 text-xs"
              >
                <Plus size={13} />
                Publish context
              </button>
            </Can>
          </div>
        </div>

        {/* Type chips */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Chip active={typeFilter === null} onClick={() => setTypeFilter(null)} label="All" count={facets.total} />
          {ALL_TYPES.map((t) => (
            <Chip
              key={t}
              active={typeFilter === t}
              onClick={() => setTypeFilter((current) => (current === t ? null : t))}
              label={TYPE_META[t].label}
              count={facets.byType[t]}
              icon={TYPE_META[t].icon}
              accent={TYPE_META[t].accent}
            />
          ))}
        </div>
      </section>

      {/* ── Results ─────────────────────────────────── */}
      {filtered.length === 0 ? (
        <LoadState
          variant="empty"
          title="No knowledge contexts here yet."
          description={
            status === 'ACTIVE'
              ? typeFilter
                ? `No active ${TYPE_META[typeFilter].label.toLowerCase()} contexts. Try a different filter or publish a new one.`
                : 'Publish your first knowledge context — Pulse uses these to ground AI answers in your operation.'
              : 'Nothing archived. Archived contexts live here for audit; publish and they move back to active.'
          }
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {filtered.map((row) => (
            <KnowledgeCard
              key={row.id}
              row={row}
              onArchive={() => {
                setArchiveTarget(row);
                setOpenDialog('archive');
              }}
            />
          ))}
        </ul>
      )}

      {/* ── Publish dialog ───────────────────────────── */}
      <PublishDialog
        open={openDialog === 'publish'}
        pending={pending}
        onClose={() => setOpenDialog(null)}
        onSubmit={(values) => run(() => publishKnowledge(values), 'Knowledge context published.')}
      />

      {/* ── Archive dialog ───────────────────────────── */}
      <Dialog
        open={openDialog === 'archive' && archiveTarget !== null}
        onClose={() => {
          setOpenDialog(null);
          setArchiveTarget(null);
        }}
        title="Archive knowledge context?"
        description="Archived contexts stop being used by Pulse. They remain in the audit ledger and can be restored by publishing again."
        dismissable={!pending}
      >
        <DialogBody>
          {archiveTarget && (
            <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/60 p-3 dark:border-zinc-800/70 dark:bg-zinc-900/40">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{archiveTarget.title}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500 dark:text-zinc-500">{archiveTarget.content}</p>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <button
            type="button"
            onClick={() => {
              setOpenDialog(null);
              setArchiveTarget(null);
            }}
            disabled={pending}
            className="btn-ghost h-9 px-4 text-xs"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => archiveTarget && run(() => archiveKnowledge({id: archiveTarget.id}), 'Knowledge context archived.')}
            disabled={pending || !archiveTarget}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 text-xs font-semibold text-white shadow-soft transition-colors hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-500 dark:hover:bg-amber-600"
          >
            {pending ? 'Working…' : 'Archive'}
          </button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

// ─── KnowledgeCard ────────────────────────────────────────────────

function KnowledgeCard({row, onArchive}: {row: PulseKnowledgeContextRecord; onArchive: () => void}) {
  const meta = TYPE_META[row.type];
  const a = ACCENT[meta.accent];
  const Icon = meta.icon;
  const isArchived = row.status === 'ARCHIVED';
  return (
    <li className="surface-translucent relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.iconBg}`}>
            <Icon size={15} />
          </span>
          <div>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${a.chip}`}>
              {meta.label}
            </span>
            <h3 className="mt-1.5 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{row.title}</h3>
          </div>
        </div>
        {isArchived && (
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500">
            <Archive size={9} />
            Archived
          </span>
        )}
      </div>

      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        {row.content}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800/60">
        <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600">
          {row.id.slice(0, 12)} · {new Date(row.publishedAt).toLocaleDateString()}
        </p>
        {!isArchived && (
          <Can permission="pulse:write">
            <button
              type="button"
              onClick={onArchive}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200/70 bg-white/70 px-2 py-1 text-[10px] font-medium text-zinc-600 transition-colors duration-150 ease-snap hover:bg-amber-50 hover:text-amber-700 dark:border-zinc-800/70 dark:bg-zinc-900/55 dark:text-zinc-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
            >
              <Archive size={10} />
              Archive
            </button>
          </Can>
        )}
      </div>
    </li>
  );
}

// ─── Chips ────────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  label,
  count,
  icon: Icon,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: LucideIcon;
  accent?: 'sky' | 'violet' | 'amber' | 'emerald' | 'rose';
}) {
  const accentChip = accent ? ACCENT[accent].chip : '';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ease-snap',
        active
          ? `${accentChip || 'border-brand-200/80 bg-brand-50/80 text-brand-700 dark:border-brand-800/60 dark:bg-brand-900/30 dark:text-brand-300'}`
          : 'border-zinc-200/70 bg-white/60 text-zinc-600 hover:bg-white dark:border-zinc-800/70 dark:bg-zinc-900/55 dark:text-zinc-400 dark:hover:bg-zinc-900',
      )}
    >
      {Icon && <Icon size={11} />}
      {label}
      <span className={cn('font-mono tabular-nums text-[10px]', active ? '' : 'text-zinc-400 dark:text-zinc-600')}>{count}</span>
    </button>
  );
}

function StatusButton({active, onClick, label, count}: {active: boolean; onClick: () => void; label: string; count: number}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors duration-150 ease-snap',
        active
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
          : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60',
      )}
    >
      {label}
      <span className="font-mono tabular-nums text-[10px] text-zinc-400 dark:text-zinc-600">{count}</span>
    </button>
  );
}

// ─── Publish dialog ──────────────────────────────────────────────

function PublishDialog({
  open,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: {type: PulseKnowledgeContextType; title: string; content: string}) => void;
}) {
  const [type, setType] = useState<PulseKnowledgeContextType>('FAQ');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSubmit({type, title: title.trim(), content: content.trim()});
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Publish knowledge context"
      description="Adds a new context Pulse can reference when grounding AI answers."
      dismissable={!pending}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          <div>
            <p className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Type</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_TYPES.map((t) => {
                const meta = TYPE_META[t];
                const a = ACCENT[meta.accent];
                const Icon = meta.icon;
                const isActive = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all duration-150 ease-snap',
                      isActive
                        ? `${a.chip} ring-1 ring-current/20`
                        : 'border-zinc-200/70 bg-white/60 text-zinc-600 hover:bg-white dark:border-zinc-800/70 dark:bg-zinc-900/55 dark:text-zinc-400 dark:hover:bg-zinc-900',
                    )}
                  >
                    <Icon size={12} className="shrink-0" />
                    <span className="truncate">{meta.label}</span>
                    {isActive && <Check size={11} className="ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300" htmlFor="kn-title">
              Title
            </label>
            <input
              id="kn-title"
              data-autofocus
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Office hours and response window"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300" htmlFor="kn-content">
              Content
            </label>
            <textarea
              id="kn-content"
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="The full text Pulse should ground answers in. Operator-safe, no secrets."
              className="min-h-[120px] w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" onClick={onClose} disabled={pending} className="btn-ghost h-9 px-4 text-xs">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary h-9 px-4 text-xs">
            {pending ? 'Publishing…' : 'Publish'}
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

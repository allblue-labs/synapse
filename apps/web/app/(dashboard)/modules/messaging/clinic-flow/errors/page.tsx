import {AlertTriangle, Clock, Phone, RotateCw, X, UserPlus} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {PageHeader} from '@/components/ui/page-header';
import {formatRelative} from '@/lib/utils';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Processing Errors — ClinicFlow AI'};

const MOCK_ERRORS = [
  {
    id: '5',
    contactPhone: '+55 11 99999-0005',
    contactName: undefined,
    errorMessage: 'Transcription confidence too low — audio quality insufficient.',
    createdAt: '2026-05-05T08:00:00Z',
    retryCount: 2,
  },
  {
    id: '6',
    contactPhone: '+55 11 99999-0006',
    contactName: 'Paula Rocha',
    errorMessage: 'LLM extraction returned no structured data — message ambiguous.',
    createdAt: '2026-05-04T22:15:00Z',
    retryCount: 1,
  },
];

export default function ErrorsPage() {
  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        eyebrow="ClinicFlow · Workspace"
        title="Processing Errors"
        description={`${MOCK_ERRORS.length} failed entries requiring attention. Retry, reassign, or dismiss with a full audit trail.`}
        icon={<AlertTriangle size={26} />}
        iconGradient="from-red-500 to-rose-500"
        glowColor="bg-red-500/15"
      />

      {MOCK_ERRORS.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-200 bg-white/40 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />
          <p className="relative text-sm font-medium text-zinc-500 dark:text-zinc-400">No errors</p>
          <p className="relative mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Processing errors will appear here when they occur.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {MOCK_ERRORS.map((entry) => (
            <article
              key={entry.id}
              className="relative overflow-hidden rounded-2xl border border-red-200/70 bg-white p-5 shadow-soft dark:border-red-900/40 dark:bg-zinc-900"
            >
              <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 text-xs font-bold text-white">
                    {(entry.contactName ?? entry.contactPhone).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {entry.contactName ?? 'Unknown contact'}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500">
                      <Phone size={10} /> {entry.contactPhone}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="failed">Failed</Badge>
                  <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500">
                    <Clock size={10} /> {formatRelative(entry.createdAt)}
                  </span>
                </div>
              </div>

              <p className="relative mt-4 rounded-lg border border-red-200/80 bg-red-50/80 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {entry.errorMessage}
              </p>

              <div className="relative mt-4 flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm">
                  <RotateCw size={12} />
                  Retry ({entry.retryCount} attempt{entry.retryCount !== 1 ? 's' : ''})
                </Button>
                <Button variant="ghost" size="sm">
                  <X size={12} />
                  Dismiss
                </Button>
                <Button variant="ghost" size="sm">
                  <UserPlus size={12} />
                  Assign to operator
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

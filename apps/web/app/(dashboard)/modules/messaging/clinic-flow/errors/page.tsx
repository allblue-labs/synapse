import Link from 'next/link';
import {ChevronRight, AlertTriangle, Clock, Phone} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
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
    <div className="animate-fade-in">
      <nav className="mb-6 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
        <Link href="/modules" className="hover:text-zinc-600 dark:hover:text-zinc-300">
          Modules
        </Link>
        <ChevronRight size={12} />
        <Link href="/modules/messaging" className="hover:text-zinc-600 dark:hover:text-zinc-300">
          Messaging
        </Link>
        <ChevronRight size={12} />
        <Link
          href="/modules/messaging/clinic-flow"
          className="hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          ClinicFlow AI
        </Link>
        <ChevronRight size={12} />
        <span className="text-zinc-600 dark:text-zinc-300">Errors</span>
      </nav>

      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          <AlertTriangle size={20} className="text-red-500" />
          Processing Errors
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {MOCK_ERRORS.length} failed entries requiring attention.
        </p>
      </div>

      {MOCK_ERRORS.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">No errors</p>
          <p className="mt-1 text-xs text-zinc-300 dark:text-zinc-600">
            Processing errors will appear here when they occur.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {MOCK_ERRORS.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-red-100 bg-red-50/40 p-5 dark:border-red-900/30 dark:bg-red-900/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-semibold text-red-600 dark:bg-red-900/40 dark:text-red-400">
                    {(entry.contactName ?? entry.contactPhone).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {entry.contactName ?? 'Unknown contact'}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                      <Phone size={10} /> {entry.contactPhone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="failed">Failed</Badge>
                  <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                    <Clock size={10} /> {formatRelative(entry.createdAt)}
                  </span>
                </div>
              </div>

              <p className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-zinc-900 dark:text-red-400">
                {entry.errorMessage}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Button variant="secondary" size="sm">
                  Retry ({entry.retryCount} attempt{entry.retryCount !== 1 ? 's' : ''})
                </Button>
                <Button variant="ghost" size="sm">
                  Dismiss
                </Button>
                <Button variant="ghost" size="sm">
                  Assign to operator
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

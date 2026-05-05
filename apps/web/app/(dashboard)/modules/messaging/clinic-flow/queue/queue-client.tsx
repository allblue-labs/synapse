'use client';

import {useState, useEffect, useCallback} from 'react';
import {ListChecks, Phone, Calendar, Clock, ChevronRight, RefreshCw} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Sheet} from '@/components/ui/sheet';
import {cn, confidenceColor, confidenceLabel, formatRelative} from '@/lib/utils';
import {api, type ClinicFlowEntry, type ClinicFlowStatus} from '@/lib/api';

const STATUS_TABS: {value: ClinicFlowStatus | 'all'; label: string}[] = [
  {value: 'all', label: 'All'},
  {value: 'processing', label: 'Processing'},
  {value: 'pending_validation', label: 'Pending'},
  {value: 'ready_to_confirm', label: 'Ready'},
  {value: 'scheduled', label: 'Scheduled'},
  {value: 'failed', label: 'Failed'},
];

const STATUS_LABELS: Record<ClinicFlowStatus, string> = {
  processing: 'Processing',
  pending_validation: 'Pending',
  ready_to_confirm: 'Ready to confirm',
  scheduled: 'Scheduled',
  failed: 'Failed',
};

const STATUS_BADGE: Record<ClinicFlowStatus, React.ComponentProps<typeof Badge>['variant']> = {
  processing: 'processing',
  pending_validation: 'pending',
  ready_to_confirm: 'ready',
  scheduled: 'scheduled',
  failed: 'failed',
};

function EntryDetail({
  entry,
  onClose,
  onActionDone,
}: {
  entry: ClinicFlowEntry;
  onClose: () => void;
  onActionDone: () => void;
}) {
  const [acting, setActing] = useState(false);

  async function handleValidate() {
    setActing(true);
    try {
      await api.clinicFlow.validate(entry.id, {extractedData: entry.extractedData ?? {}});
      onActionDone();
      onClose();
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    setActing(true);
    try {
      await api.clinicFlow.reject(entry.id, 'Rejected by operator');
      onActionDone();
      onClose();
    } finally {
      setActing(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={entry.contactName ?? entry.contactPhone} width="lg">
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_BADGE[entry.status]}>
            {STATUS_LABELS[entry.status]}
          </Badge>
          {entry.confidence != null && (
            <span className={cn('text-sm font-medium', confidenceColor(entry.confidence))}>
              {Math.round(entry.confidence * 100)}% confidence — {confidenceLabel(entry.confidence)}
            </span>
          )}
        </div>

        {(entry.originalMessage || entry.transcription) && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {entry.transcription ? 'Transcription' : 'Original Message'}
            </p>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {entry.transcription ?? entry.originalMessage}
              </p>
            </div>
          </div>
        )}

        {entry.extractedData && Object.keys(entry.extractedData).length > 0 && (
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Extracted Data
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(entry.extractedData).map(([k, v]) =>
                v ? (
                  <div
                    key={k}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <p className="capitalize text-xs text-zinc-400 dark:text-zinc-500">{k}</p>
                    <p className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {String(v)}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
          </div>
        )}

        {entry.aiSummary && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              AI Summary
            </p>
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              {entry.aiSummary}
            </p>
          </div>
        )}

        {entry.errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">{entry.errorMessage}</p>
          </div>
        )}

        {entry.processingLogs && entry.processingLogs.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Processing Logs
            </p>
            <div className="space-y-1">
              {entry.processingLogs.map((log, i) => (
                <div key={i} className="flex gap-3 text-xs">
                  <span className="shrink-0 font-mono text-zinc-400 dark:text-zinc-500">
                    {new Date(log.at).toLocaleTimeString()}
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {log.stage}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(entry.status === 'pending_validation' || entry.status === 'ready_to_confirm') && (
          <div className="flex gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <Button
              variant="primary"
              size="sm"
              onClick={handleValidate}
              disabled={acting}
            >
              Approve
            </Button>
            <Button variant="secondary" size="sm" disabled={acting}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={handleReject}
              disabled={acting}
            >
              Reject
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

export function QueueClient() {
  const [activeTab, setActiveTab] = useState<ClinicFlowStatus | 'all'>('all');
  const [entries, setEntries] = useState<ClinicFlowEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ClinicFlowEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.clinicFlow.list({
        status: activeTab === 'all' ? undefined : activeTab,
      });
      setEntries(result.data);
      setTotal(result.total);
    } catch {
      // API not available in dev — entries stay empty
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            <ListChecks size={20} className="text-brand-500" />
            Validation Queue
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {loading ? '—' : `${total} total`}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {STATUS_TABS.map(({value, label}) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === value
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <RefreshCw size={18} className="animate-spin text-zinc-300 dark:text-zinc-600" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
            No entries in queue
          </p>
          <p className="mt-1 text-xs text-zinc-300 dark:text-zinc-600">
            New scheduling requests will appear here as they arrive.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/60">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Contact</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 md:table-cell">Procedure</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 lg:table-cell">Date / Time</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 sm:table-cell">Confidence</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Age</th>
                <th className="w-8 px-4 py-3" aria-label="Open detail" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className="cursor-pointer transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {(entry.contactName ?? entry.contactPhone).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {entry.contactName ?? 'Unknown'}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                          <Phone size={10} /> {entry.contactPhone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3.5 md:table-cell">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {entry.extractedData?.procedure ?? '—'}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3.5 lg:table-cell">
                    {entry.extractedData?.date ? (
                      <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <Calendar size={12} />
                        {entry.extractedData.date}
                        {entry.extractedData.time && (
                          <>
                            <Clock size={12} className="ml-1" />
                            {entry.extractedData.time}
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3.5 sm:table-cell">
                    {entry.confidence != null ? (
                      <span className={cn('text-xs font-medium', confidenceColor(entry.confidence))}>
                        {Math.round(entry.confidence * 100)}%
                      </span>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={STATUS_BADGE[entry.status]}>
                      {STATUS_LABELS[entry.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {formatRelative(entry.createdAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <EntryDetail
          entry={selected}
          onClose={() => setSelected(null)}
          onActionDone={load}
        />
      )}
    </div>
  );
}

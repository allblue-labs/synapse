'use client';

import {useState} from 'react';
import {Settings2, Save, CheckCircle2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {PageHeader} from '@/components/ui/page-header';

export default function PulseSettingsPage() {
  const [confidence, setConfidence] = useState(0.7);
  const [autoApprove, setAutoApprove] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        eyebrow="Pulse · Workspace"
        title="Settings"
        description="Configure AI extraction rules, confidence thresholds and calendar integration endpoints."
        icon={<Settings2 size={26} />}
        iconGradient="from-zinc-700 to-zinc-500"
        glowColor="bg-zinc-500/15"
      />

      <form onSubmit={handleSave} className="grid max-w-3xl gap-6">

        {/* AI Extraction */}
        <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />

          <div className="relative border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              AI Extraction
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Configure how the AI extracts scheduling data from messages.
            </p>
          </div>

          <div className="relative space-y-6 px-6 py-5">
            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <label htmlFor="confidence" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Confidence threshold
                  </label>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Entries below this threshold are flagged for review.
                  </p>
                </div>
                <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
              <input
                id="confidence"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
              <div className="mt-1 flex justify-between text-[11px] text-zinc-400 dark:text-zinc-600">
                <span>0% — always flag</span>
                <span>100% — never flag</span>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-5 dark:border-zinc-800">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-brand-600"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Auto-approve high-confidence entries
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Entries above threshold are confirmed without operator review.
                    Not recommended for high-value procedures.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* Calendar */}
        <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
          <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />

          <div className="relative border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Calendar Integration
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Connect your calendar to create appointments automatically.
            </p>
          </div>

          <div className="relative px-6 py-5">
            <label htmlFor="calendar" className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Calendar webhook URL
            </label>
            <input
              id="calendar"
              type="url"
              placeholder="https://calendar.example.com/webhook"
              value={calendarUrl}
              onChange={(e) => setCalendarUrl(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-soft outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-brand-400"
            />
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">
              POST requests will be sent with appointment data when an entry is scheduled.
            </p>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <Button type="submit" size="md">
            <Save size={13} />
            Save changes
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={13} />
              Saved successfully.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

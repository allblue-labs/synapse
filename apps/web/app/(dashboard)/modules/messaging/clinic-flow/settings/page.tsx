'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ChevronRight, Settings2} from 'lucide-react';
import {Button} from '@/components/ui/button';

export default function ClinicFlowSettingsPage() {
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
        <span className="text-zinc-600 dark:text-zinc-300">Settings</span>
      </nav>

      <div className="mb-8 flex items-center gap-3">
        <Settings2 size={20} className="text-zinc-400" />
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          ClinicFlow Settings
        </h1>
      </div>

      <form onSubmit={handleSave} className="max-w-xl space-y-8">
        <section>
          <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            AI Extraction
          </h2>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Configure how the AI extracts scheduling data from messages.
          </p>

          <div className="space-y-4 rounded-xl border border-zinc-200 bg-white/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div>
              <label className="mb-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Confidence threshold
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Entries below this threshold are flagged for review.
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {Math.round(confidence * 100)}%
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
              <div className="mt-1 flex justify-between text-xs text-zinc-400">
                <span>0% — always flag</span>
                <span>100% — never flag</span>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <label className="flex items-start gap-3">
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
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Entries above threshold are confirmed without operator review. Not recommended for high-value procedures.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Calendar Integration
          </h2>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Connect your calendar to create appointments automatically.
          </p>

          <div className="rounded-xl border border-zinc-200 bg-white/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
            <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Calendar webhook URL
            </label>
            <input
              type="url"
              placeholder="https://calendar.example.com/webhook"
              value={calendarUrl}
              onChange={(e) => setCalendarUrl(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-brand-400"
            />
            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
              POST requests will be sent with appointment data when an entry is scheduled.
            </p>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <Button type="submit" size="md">
            Save changes
          </Button>
          {saved && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Saved successfully.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

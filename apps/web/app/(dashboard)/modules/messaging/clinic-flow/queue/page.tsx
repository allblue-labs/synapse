import {Suspense} from 'react';
import Link from 'next/link';
import {ChevronRight} from 'lucide-react';
import {QueueClient} from './queue-client';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Validation Queue — ClinicFlow AI'};

export default function QueuePage() {
  return (
    <div className="animate-fade-in">
      <nav className="mb-6 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
        <Link href="/modules" className="hover:text-zinc-600 dark:hover:text-zinc-300">
          Modules
        </Link>
        <ChevronRight size={12} />
        <Link
          href="/modules/messaging"
          className="hover:text-zinc-600 dark:hover:text-zinc-300"
        >
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
        <span className="text-zinc-600 dark:text-zinc-300">Queue</span>
      </nav>

      <Suspense
        fallback={
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            Loading…
          </div>
        }
      >
        <QueueClient />
      </Suspense>
    </div>
  );
}

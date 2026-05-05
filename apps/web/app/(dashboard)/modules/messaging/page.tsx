import Link from 'next/link';
import {
  MessageSquare,
  CalendarClock,
  MessagesSquare,
  Radio,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import type {Metadata} from 'next';

export const metadata: Metadata = {title: 'Messaging'};

export default function MessagingPage() {
  return (
    <div className="animate-fade-in">
      <nav className="mb-6 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
        <Link href="/modules" className="hover:text-zinc-600 dark:hover:text-zinc-300">
          Modules
        </Link>
        <ChevronRight size={12} />
        <span className="text-zinc-600 dark:text-zinc-300">Messaging</span>
      </nav>

      <div className="mb-10 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <MessageSquare size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Messaging
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Connect messaging channels and automate conversations with AI agents.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/modules/messaging/clinic-flow"
          className="group rounded-xl border border-zinc-200 bg-white/60 p-6 transition hover:border-brand-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-brand-700"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CalendarClock size={20} />
            </div>
            <Badge variant="active">Active</Badge>
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">ClinicFlow AI</h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Automate WhatsApp scheduling with AI transcription, extraction and human validation.
          </p>
          <div className="mt-5 flex items-center gap-1 text-xs font-medium text-brand-600 opacity-0 transition group-hover:opacity-100 dark:text-brand-400">
            Open <ArrowRight size={12} />
          </div>
        </Link>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50/40 p-6 dark:border-zinc-800/50 dark:bg-zinc-900/20">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <MessagesSquare size={20} />
            </div>
            <Badge variant="inactive">Soon</Badge>
          </div>
          <h3 className="font-semibold text-zinc-400 dark:text-zinc-500">Conversations</h3>
          <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-600">
            Full conversation history with search, filters and handoff.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50/40 p-6 dark:border-zinc-800/50 dark:bg-zinc-900/20">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <Radio size={20} />
            </div>
            <Badge variant="inactive">Soon</Badge>
          </div>
          <h3 className="font-semibold text-zinc-400 dark:text-zinc-500">Channels</h3>
          <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-600">
            Connect and manage WhatsApp, Telegram and Discord channels.
          </p>
        </div>
      </div>
    </div>
  );
}

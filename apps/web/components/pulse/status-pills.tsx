import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Megaphone,
  MessagesSquare,
  Phone,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Ticket,
  UserCheck,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {
  Priority,
  PulseChannelProvider,
  PulseSkillType,
  PulseTicketStatus,
  PulseTicketType,
} from '@/lib/pulse/types';

/**
 * Operational status pills.
 *
 * Each pill is a small visual contract: read at a glance, stable across
 * the whole product. They share one base look so a row mixing TicketStatus,
 * Skill, Priority and Channel pills reads as a single unit, not a parade.
 *
 * Visual rule: pill background is always tinted, never solid. That keeps
 * tables readable when rows of pills stack vertically.
 */

const BASE = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap';

// ─── TicketStatus ────────────────────────────────────────────────────

const TICKET_STATUS_STYLE: Record<
  PulseTicketStatus,
  {label: string; tone: string; icon: LucideIcon}
> = {
  OPEN: {
    label: 'Open',
    tone: 'border-blue-200/80 bg-blue-50/80 text-blue-700 dark:border-blue-800/60 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Ticket,
  },
  PENDING_REVIEW: {
    label: 'Needs review',
    tone: 'border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-400',
    icon: AlertTriangle,
  },
  WAITING_CUSTOMER: {
    label: 'Waiting customer',
    tone: 'border-zinc-200/80 bg-zinc-50/80 text-zinc-600 dark:border-zinc-700/60 dark:bg-zinc-800/60 dark:text-zinc-400',
    icon: Clock,
  },
  RESOLVED: {
    label: 'Resolved',
    tone: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelled',
    tone: 'border-zinc-200 bg-white/60 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500',
    icon: XCircle,
  },
};

export function TicketStatusPill({status, className}: {status: PulseTicketStatus; className?: string}) {
  const {label, tone, icon: Icon} = TICKET_STATUS_STYLE[status];
  return (
    <span className={cn(BASE, tone, className)}>
      <Icon size={11} />
      {label}
    </span>
  );
}

// ─── Skill ───────────────────────────────────────────────────────────

const SKILL_STYLE: Record<
  PulseSkillType,
  {label: string; tone: string; icon: LucideIcon}
> = {
  SCHEDULER: {
    label: 'Scheduler',
    tone: 'border-brand-200/80 bg-brand-50/80 text-brand-700 dark:border-brand-800/60 dark:bg-brand-900/30 dark:text-brand-400',
    icon: Clock,
  },
  SALES: {
    label: 'Sales',
    tone: 'border-violet-200/80 bg-violet-50/80 text-violet-700 dark:border-violet-800/60 dark:bg-violet-900/30 dark:text-violet-400',
    icon: ShoppingCart,
  },
  SUPPORT: {
    label: 'Support',
    tone: 'border-sky-200/80 bg-sky-50/80 text-sky-700 dark:border-sky-800/60 dark:bg-sky-900/30 dark:text-sky-400',
    icon: Wrench,
  },
  KNOWLEDGE: {
    label: 'Knowledge',
    tone: 'border-cyan-200/80 bg-cyan-50/80 text-cyan-700 dark:border-cyan-800/60 dark:bg-cyan-900/30 dark:text-cyan-400',
    icon: Sparkles,
  },
  MARKETING: {
    label: 'Marketing',
    tone: 'border-rose-200/80 bg-rose-50/80 text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/30 dark:text-rose-400',
    icon: Megaphone,
  },
  OPERATOR: {
    label: 'Operator',
    tone: 'border-zinc-200/80 bg-zinc-100/80 text-zinc-700 dark:border-zinc-700/60 dark:bg-zinc-800/60 dark:text-zinc-300',
    icon: UserCheck,
  },
};

export function SkillPill({skill, className}: {skill: PulseSkillType; className?: string}) {
  const {label, tone, icon: Icon} = SKILL_STYLE[skill];
  return (
    <span className={cn(BASE, tone, className)}>
      <Icon size={11} />
      {label}
    </span>
  );
}

// ─── Priority ────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<
  Priority,
  {label: string; tone: string; icon?: LucideIcon}
> = {
  URGENT: {
    label: 'Urgent',
    tone: 'border-red-200/80 bg-red-50/80 text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertOctagon,
  },
  HIGH: {
    label: 'High',
    tone: 'border-orange-200/80 bg-orange-50/80 text-orange-700 dark:border-orange-800/60 dark:bg-orange-900/30 dark:text-orange-400',
  },
  NORMAL: {
    label: 'Normal',
    tone: 'border-zinc-200/80 bg-zinc-50/80 text-zinc-600 dark:border-zinc-700/60 dark:bg-zinc-800/60 dark:text-zinc-400',
  },
  LOW: {
    label: 'Low',
    tone: 'border-zinc-200 bg-white/60 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500',
  },
};

export function PriorityPill({priority, className}: {priority: Priority; className?: string}) {
  const {label, tone, icon: Icon} = PRIORITY_STYLE[priority];
  return (
    <span className={cn(BASE, tone, className)}>
      {Icon && <Icon size={11} />}
      {label}
    </span>
  );
}

// ─── TicketType ──────────────────────────────────────────────────────

const TICKET_TYPE_STYLE: Record<PulseTicketType, {label: string; icon: LucideIcon}> = {
  SUPPORT:           {label: 'Support',           icon: Wrench},
  SALES:             {label: 'Sales',             icon: ShoppingCart},
  SCHEDULING:        {label: 'Scheduling',        icon: Clock},
  MARKETING:         {label: 'Marketing',         icon: Megaphone},
  OPERATOR_REVIEW:   {label: 'Operator review',   icon: ShieldCheck},
  KNOWLEDGE_REQUEST: {label: 'Knowledge request', icon: Info},
};

export function TicketTypePill({type, className}: {type: PulseTicketType; className?: string}) {
  const {label, icon: Icon} = TICKET_TYPE_STYLE[type];
  return (
    <span
      className={cn(
        BASE,
        'border-zinc-200/80 bg-zinc-50/80 text-zinc-700 dark:border-zinc-700/60 dark:bg-zinc-800/60 dark:text-zinc-300',
        className,
      )}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

// ─── ChannelBadge ────────────────────────────────────────────────────

const CHANNEL_STYLE: Record<PulseChannelProvider, {label: string; icon: LucideIcon; tone: string}> = {
  WHATSAPP: {
    label: 'WhatsApp',
    icon: Phone,
    tone: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  TELEGRAM: {
    label: 'Telegram',
    icon: Send,
    tone: 'border-sky-200/80 bg-sky-50/80 text-sky-700 dark:border-sky-800/60 dark:bg-sky-900/30 dark:text-sky-400',
  },
};

/**
 * Returns `null` when `channel` is `null` so callers don't render an
 * empty pill — the surrounding row collapses naturally.
 */
export function ChannelPill({channel, className}: {channel: PulseChannelProvider | null; className?: string}) {
  if (!channel) return null;
  const {label, icon: Icon, tone} = CHANNEL_STYLE[channel];
  return (
    <span className={cn(BASE, tone, className)}>
      <Icon size={11} />
      {label}
    </span>
  );
}

// ─── EscalationBadge — visible only when escalated ───────────────────

export function EscalationBadge({className}: {className?: string}) {
  return (
    <span
      className={cn(
        BASE,
        'border-red-200/80 bg-red-50/80 text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-400',
        className,
      )}
    >
      <AlertOctagon size={11} />
      Escalated
    </span>
  );
}

// ─── ConversationStateChip — used in the workflow panel ──────────────

const CONVERSATION_STATE_LABEL: Record<string, string> = {
  NEW:               'New',
  IN_FLOW:           'In flow',
  WAITING_CUSTOMER:  'Waiting customer',
  WAITING_OPERATOR:  'Waiting operator',
  RESOLVED:          'Resolved',
  CANCELLED:         'Cancelled',
};

export function ConversationStatePill({state, className}: {state: string; className?: string}) {
  const label = CONVERSATION_STATE_LABEL[state] ?? state;
  return (
    <span
      className={cn(
        BASE,
        'border-zinc-200/80 bg-zinc-100/80 text-zinc-700 dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-300',
        className,
      )}
    >
      <MessagesSquare size={11} />
      {label}
    </span>
  );
}

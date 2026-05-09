'use client';

import {useState, useTransition, type ReactNode} from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  ShieldAlert,
  UserPlus,
  Workflow,
  XCircle,
} from 'lucide-react';
import {Can} from '@/components/auth/can';
import {Dialog, DialogBody, DialogFooter} from '@/components/ui/dialog';
import {useToast} from '@/components/ui/toast';
import {EscalationBadge} from '@/components/pulse/status-pills';
import {PULSE_FLOW_STATES, type PulseFlowState} from '@/lib/api';
import {
  advanceFlowState,
  assignTicket,
  cancelTicket,
  escalateTicket,
  reopenTicket,
  resolveTicket,
  submitOperatorReview,
  type ActionResult,
} from '@/lib/pulse/actions';
import type {PulseTicketDetailVM} from '@/lib/pulse/types';
import {cn} from '@/lib/utils';

/**
 * TicketActionBar — the click-to-act layer of the ticket detail screen.
 *
 *   - Each lifecycle command is a `<Can>`-gated button. The backend is
 *     still the only authority — these gates are usability scaffolding.
 *   - Buttons that need operator input (assign, escalate, cancel,
 *     resolve, reopen, operator-review, flow-advance) open a small
 *     dialog with the right inputs and feed them into the matching
 *     server action from `lib/pulse/actions.ts`.
 *   - Action results land as toasts. `success` / `forbidden` / `invalid` /
 *     `error` outcomes each get distinct UI tone.
 *   - Server actions call `revalidatePath` on success so the parent
 *     RSC re-renders with fresh ticket data — no client refetch needed.
 *
 * `capabilities.canX` flags are *FSM hints* — they disable buttons when
 * the action would never succeed (e.g. resolve a `RESOLVED` ticket).
 * Permissions still drive whether the button shows at all.
 */
export interface TicketActionBarProps {
  ticket: PulseTicketDetailVM;
}

type DialogKind =
  | null
  | 'assign'
  | 'escalate'
  | 'cancel'
  | 'resolve'
  | 'reopen'
  | 'operator_review'
  | 'flow_advance';

export function TicketActionBar({ticket}: TicketActionBarProps) {
  const [open, setOpen] = useState<DialogKind>(null);
  const [pending, startTransition] = useTransition();
  const {toast} = useToast();

  function close() {
    if (!pending) setOpen(null);
  }

  /**
   * Run a Server Action and convert its `ActionResult` into a toast.
   * Closes the dialog only on success — failures keep the input open
   * so the operator can correct and retry.
   */
  function run<T>(action: () => Promise<ActionResult<T>>, successTitle: string) {
    startTransition(async () => {
      const result = await action();
      if (result.kind === 'ok') {
        toast({variant: 'success', title: successTitle});
        setOpen(null);
        return;
      }
      if (result.kind === 'forbidden') {
        toast({
          variant: 'forbidden',
          title: 'Permission denied.',
          description: result.message,
        });
        return;
      }
      if (result.kind === 'invalid') {
        toast({
          variant: 'error',
          title: 'Could not complete the action.',
          description: result.message,
        });
        return;
      }
      toast({
        variant: 'error',
        title: 'Action failed.',
        description: result.message,
      });
    });
  }

  const caps = ticket.capabilities;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {ticket.priority === 'URGENT' && <EscalationBadge />}

        <Can permission="tickets:assign">
          <ActionButton
            icon={<UserPlus size={13} />}
            label="Assign"
            onClick={() => setOpen('assign')}
            tone="secondary"
          />
        </Can>

        <Can permission="tickets:assign">
          <ActionButton
            icon={<ShieldAlert size={13} />}
            label="Escalate"
            onClick={() => setOpen('escalate')}
            disabled={!caps.canEscalate}
            tone="secondary"
          />
        </Can>

        <Can permission="tickets:write">
          <ActionButton
            icon={<ClipboardCheck size={13} />}
            label="Operator review"
            onClick={() => setOpen('operator_review')}
            tone="secondary"
          />
        </Can>

        <Can permission="tickets:write">
          <ActionButton
            icon={<Workflow size={13} />}
            label="Advance flow"
            onClick={() => setOpen('flow_advance')}
            tone="secondary"
          />
        </Can>

        <Can permission="tickets:resolve">
          <ActionButton
            icon={<CheckCircle2 size={13} />}
            label="Resolve"
            onClick={() => setOpen('resolve')}
            disabled={!caps.canResolve}
            tone="primary"
          />
        </Can>

        <Can permission="tickets:write">
          <ActionButton
            icon={<RefreshCw size={13} />}
            label="Reopen"
            onClick={() => setOpen('reopen')}
            disabled={!caps.canReopen}
            tone="secondary"
          />
          <ActionButton
            icon={<XCircle size={13} />}
            label="Cancel"
            onClick={() => setOpen('cancel')}
            tone="danger"
          />
        </Can>
      </div>

      {/* ── Assign ─────────────────────────────────────────── */}
      <AssignDialog
        open={open === 'assign'}
        pending={pending}
        onClose={close}
        onSubmit={(values) => run(
          () => assignTicket({ticketId: ticket.id, ...values}),
          'Ticket assigned.',
        )}
      />

      {/* ── Escalate ───────────────────────────────────────── */}
      <ReasonAndPriorityDialog
        open={open === 'escalate'}
        pending={pending}
        title="Escalate ticket"
        description="Raise the ticket's priority and explain why a senior operator should look at it."
        confirmLabel="Escalate"
        confirmTone="primary"
        onClose={close}
        onSubmit={(values) => run(
          () => escalateTicket({ticketId: ticket.id, ...values}),
          'Ticket escalated.',
        )}
      />

      {/* ── Cancel ─────────────────────────────────────────── */}
      <ReasonDialog
        open={open === 'cancel'}
        pending={pending}
        title="Cancel ticket"
        description="The ticket will be closed without resolution. Add a reason for the operational record."
        confirmLabel="Cancel ticket"
        confirmTone="danger"
        reasonLabel="Reason"
        onClose={close}
        onSubmit={(values) => run(
          () => cancelTicket({ticketId: ticket.id, ...values}),
          'Ticket cancelled.',
        )}
      />

      {/* ── Resolve ────────────────────────────────────────── */}
      <ReasonDialog
        open={open === 'resolve'}
        pending={pending}
        title="Resolve ticket"
        description="Close the ticket. A short summary helps audit and future search."
        confirmLabel="Resolve"
        confirmTone="primary"
        reasonLabel="Resolution summary"
        reasonField="resolutionSummary"
        onClose={close}
        onSubmit={(values) => run(
          () => resolveTicket({ticketId: ticket.id, resolutionSummary: values.reason}),
          'Ticket resolved.',
        )}
      />

      {/* ── Reopen ─────────────────────────────────────────── */}
      <ReasonDialog
        open={open === 'reopen'}
        pending={pending}
        title="Reopen ticket"
        description="Move the ticket back to OPEN. Add a reason if there's new context to share."
        confirmLabel="Reopen"
        confirmTone="primary"
        reasonLabel="Reason"
        onClose={close}
        onSubmit={(values) => run(
          () => reopenTicket({ticketId: ticket.id, ...values}),
          'Ticket reopened.',
        )}
      />

      {/* ── Operator review ────────────────────────────────── */}
      <OperatorReviewDialog
        open={open === 'operator_review'}
        pending={pending}
        onClose={close}
        onSubmit={(values) => run(
          () => submitOperatorReview({ticketId: ticket.id, ...values}),
          'Operator review submitted.',
        )}
      />

      {/* ── Flow advance ───────────────────────────────────── */}
      <AdvanceFlowDialog
        open={open === 'flow_advance'}
        pending={pending}
        onClose={close}
        onSubmit={(values) => run(
          () => advanceFlowState({ticketId: ticket.id, ...values}),
          'Flow advanced.',
        )}
      />
    </>
  );
}

// ─── Button ────────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone: 'primary' | 'secondary' | 'danger';
}

function ActionButton({icon, label, onClick, disabled, tone}: ActionButtonProps) {
  const className = cn(
    'h-9 px-3.5 text-xs disabled:opacity-50',
    tone === 'primary'   && 'btn-primary',
    tone === 'secondary' && 'btn-secondary',
    tone === 'danger'    && 'btn-ghost text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
  );
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {icon}
      {label}
    </button>
  );
}

// ─── Reusable form pieces ─────────────────────────────────────────

const INPUT = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-shadow focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500';
const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-700 dark:text-zinc-300';

function ConfirmButton({label, tone, pending}: {label: string; tone: 'primary' | 'danger'; pending: boolean}) {
  const className = cn(
    'h-9 px-4 text-xs font-semibold disabled:opacity-50',
    tone === 'primary' && 'btn-primary',
    tone === 'danger'  && 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 text-white shadow-soft transition-colors hover:bg-red-700 active:scale-[0.98] dark:bg-red-500 dark:hover:bg-red-600',
  );
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? 'Working…' : label}
    </button>
  );
}

// ─── Dialog: assign ───────────────────────────────────────────────

function AssignDialog({open, pending, onClose, onSubmit}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: {assignedUserId: string; note?: string}) => void;
}) {
  const [assignedUserId, setAssignedUserId] = useState('');
  const [note, setNote] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignedUserId.trim()) return;
    onSubmit({assignedUserId: assignedUserId.trim(), note: note.trim() || undefined});
  }

  return (
    <Dialog open={open} onClose={onClose} title="Assign ticket" description="Hand the ticket off to a specific operator." dismissable={!pending}>
      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          <div>
            <label className={LABEL} htmlFor="assignedUserId">Assigned user id</label>
            <input
              id="assignedUserId"
              data-autofocus
              type="text"
              required
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              placeholder="user_…"
              className={INPUT}
            />
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
              Member-picker pending — see <code className="font-mono">docs/UX_ARCHITECTURE.md</code>.
            </p>
          </div>
          <div>
            <label className={LABEL} htmlFor="note">Note (optional)</label>
            <textarea
              id="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why are you assigning this?"
              className={cn(INPUT, 'min-h-[60px] resize-none')}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" onClick={onClose} disabled={pending} className="btn-ghost h-9 px-4 text-xs">
            Cancel
          </button>
          <ConfirmButton label="Assign" tone="primary" pending={pending} />
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ─── Dialog: simple reason ──────────────────────────────────────

interface ReasonDialogProps {
  open: boolean;
  pending: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone: 'primary' | 'danger';
  reasonLabel: string;
  reasonField?: string;
  onClose: () => void;
  onSubmit: (values: {reason: string}) => void;
}

function ReasonDialog({open, pending, title, description, confirmLabel, confirmTone, reasonLabel, reasonField, onClose, onSubmit}: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const fieldId = reasonField ?? 'reason';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({reason: reason.trim()});
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} dismissable={!pending}>
      <form onSubmit={handleSubmit}>
        <DialogBody>
          <label className={LABEL} htmlFor={fieldId}>{reasonLabel}</label>
          <textarea
            id={fieldId}
            data-autofocus
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="A short, audit-safe note."
            className={cn(INPUT, 'min-h-[80px] resize-none')}
          />
        </DialogBody>
        <DialogFooter>
          <button type="button" onClick={onClose} disabled={pending} className="btn-ghost h-9 px-4 text-xs">
            Back
          </button>
          <ConfirmButton label={confirmLabel} tone={confirmTone} pending={pending} />
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ─── Dialog: reason + priority ────────────────────────────────

function ReasonAndPriorityDialog({open, pending, title, description, confirmLabel, confirmTone, onClose, onSubmit}: {
  open: boolean;
  pending: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone: 'primary' | 'danger';
  onClose: () => void;
  onSubmit: (values: {reason?: string; priority?: number}) => void;
}) {
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState(75);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      reason: reason.trim() || undefined,
      priority,
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} dismissable={!pending}>
      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          <div>
            <label className={LABEL} htmlFor="reason">Reason</label>
            <textarea
              id="reason"
              data-autofocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="A short, audit-safe note."
              className={cn(INPUT, 'min-h-[80px] resize-none')}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={LABEL} htmlFor="priority">Priority</label>
              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-mono tabular-nums text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {priority}
              </span>
            </div>
            <input
              id="priority"
              type="range"
              min={0}
              max={100}
              step={5}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="mt-1 flex justify-between text-[10px] text-zinc-400 dark:text-zinc-600">
              <span>0 · low</span>
              <span>50 · normal</span>
              <span>100 · urgent</span>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" onClick={onClose} disabled={pending} className="btn-ghost h-9 px-4 text-xs">
            Back
          </button>
          <ConfirmButton label={confirmLabel} tone={confirmTone} pending={pending} />
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ─── Dialog: operator review ──────────────────────────────────

function OperatorReviewDialog({open, pending, onClose, onSubmit}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: {summary?: string; confidence?: number; approved: boolean; category?: string}) => void;
}) {
  const [approved, setApproved] = useState(true);
  const [summary, setSummary] = useState('');
  const [confidence, setConfidence] = useState(80);
  const [category, setCategory] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      approved,
      summary:    summary.trim() || undefined,
      confidence: confidence / 100,
      category:   category.trim() || undefined,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Submit operator review"
      description="Record the operator's decision on this ticket. Audit-safe — never paste raw provider data here."
      dismissable={!pending}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          <div>
            <p className={LABEL}>Decision</p>
            <div className="grid grid-cols-2 gap-2">
              <DecisionToggle label="Approve" active={approved}  onClick={() => setApproved(true)}  tone="emerald" />
              <DecisionToggle label="Reject"  active={!approved} onClick={() => setApproved(false)} tone="red" />
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="review-summary">Summary</label>
            <textarea
              id="review-summary"
              data-autofocus
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What did you confirm? What did you correct?"
              className={cn(INPUT, 'min-h-[80px] resize-none')}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="review-category">Category (optional)</label>
            <input
              id="review-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="sales / support / scheduling / …"
              className={INPUT}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={LABEL} htmlFor="review-confidence">Confidence override</label>
              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-mono tabular-nums text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {confidence}%
              </span>
            </div>
            <input
              id="review-confidence"
              type="range"
              min={0}
              max={100}
              step={5}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" onClick={onClose} disabled={pending} className="btn-ghost h-9 px-4 text-xs">
            Back
          </button>
          <ConfirmButton label="Submit review" tone="primary" pending={pending} />
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function DecisionToggle({label, active, onClick, tone}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone: 'emerald' | 'red';
}) {
  const baseRing = 'border-zinc-200 dark:border-zinc-700';
  const activeRing = tone === 'emerald'
    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700/60'
    : 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-300 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-700/60';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors',
        active ? activeRing : `${baseRing} bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800`,
      )}
    >
      {label}
    </button>
  );
}

// ─── Dialog: advance flow state ────────────────────────────────

function AdvanceFlowDialog({open, pending, onClose, onSubmit}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: {nextState: PulseFlowState; transitionSource?: 'manual' | 'system'; confidence?: number; note?: string}) => void;
}) {
  const [nextState, setNextState] = useState<PulseFlowState>('classify_intent');
  const [note, setNote] = useState('');
  const [confidence, setConfidence] = useState(80);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      nextState,
      transitionSource: 'manual',
      confidence: confidence / 100,
      note: note.trim() || undefined,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Advance flow state"
      description="Move the ticket forward in its workflow. Choose the next state from the Pulse FSM."
      dismissable={!pending}
    >
      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          <div>
            <label className={LABEL} htmlFor="flow-nextState">Next state</label>
            <select
              id="flow-nextState"
              data-autofocus
              value={nextState}
              onChange={(e) => setNextState(e.target.value as PulseFlowState)}
              className={INPUT}
            >
              {PULSE_FLOW_STATES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="flow-note">Note (optional)</label>
            <textarea
              id="flow-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What signals informed this transition?"
              className={cn(INPUT, 'min-h-[80px] resize-none')}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={LABEL} htmlFor="flow-confidence">Confidence</label>
              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-mono tabular-nums text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {confidence}%
              </span>
            </div>
            <input
              id="flow-confidence"
              type="range"
              min={0}
              max={100}
              step={5}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" onClick={onClose} disabled={pending} className="btn-ghost h-9 px-4 text-xs">
            Back
          </button>
          <ConfirmButton label="Advance" tone="primary" pending={pending} />
        </DialogFooter>
      </form>
    </Dialog>
  );
}

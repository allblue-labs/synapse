'use client';

import {useMemo, useState, useTransition} from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  Mail,
  Pause,
  Play,
  Search,
  ShieldAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {Sheet, SheetBody, SheetFooter, SheetSection} from '@/components/ui/sheet';
import {StatusPill, type StatusTone} from '@/components/ui/status-pill';
import {InlineAction} from '@/components/ui/inline-action';
import {PeriodFilter} from '@/components/platform/period-filter';
import {AnimatedNumber} from '@/components/ui/animated-number';
import {useToast} from '@/components/ui/toast';
import {cn} from '@/lib/utils';

/**
 * Platform · Tenants — operational directory.
 *
 *   - One operational table with toolbar (search, status filter chips).
 *   - Row click opens a detail Sheet on the right (no route change) so
 *     operators can sweep through the directory without losing context.
 *   - Inline row actions (Suspend / Restore / Email owner) with their
 *     own pending state. All actions today route through `<InlineAction>`
 *     placeholders that toast on click; mutations land on real backend
 *     endpoints when `platform:tenants:manage` ships.
 *   - Realtime states via `<StatusPill pulse>` for `Active`.
 *
 * Per Stage 7 strategy:
 *   - operational table, not a CRUD form
 *   - detail side panel, not a new route
 *   - inline actions, not a giant edit modal
 *
 * No backend client today — rows are seeded placeholders so the UX
 * pattern is reviewable. The seam to swap for real data is `useMemo`
 * inside this component.
 */

// ─── Types ───────────────────────────────────────────────────────────

type TenantStatus = 'ACTIVE' | 'TRIALING' | 'SUSPENDED' | 'PENDING' | 'PAST_DUE' | 'CANCELLED';
type PlanKey     = 'trial' | 'light' | 'pro' | 'premium';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  status: TenantStatus;
  plan: PlanKey;
  members: number;
  modulesEnabled: number;
  createdAt: string;
}

// ─── Placeholder rows ────────────────────────────────────────────────

const ROWS: ReadonlyArray<TenantRow> = [
  {id: 'tn_001', name: 'Acme Health',         slug: 'acme-health',         ownerEmail: 'owner@acmehealth.com',   status: 'ACTIVE',    plan: 'premium', members: 14, modulesEnabled: 3, createdAt: '2026-04-12T10:24:00Z'},
  {id: 'tn_002', name: 'Northwind Logistics', slug: 'northwind',           ownerEmail: 'ops@northwind.com',      status: 'ACTIVE',    plan: 'pro',     members: 22, modulesEnabled: 2, createdAt: '2026-04-22T14:08:00Z'},
  {id: 'tn_003', name: 'Studio Alpha',        slug: 'studio-alpha',        ownerEmail: 'hello@studioalpha.io',   status: 'TRIALING',  plan: 'trial',   members: 4,  modulesEnabled: 1, createdAt: '2026-05-08T09:11:00Z'},
  {id: 'tn_004', name: 'Civic Records',       slug: 'civic-records',       ownerEmail: 'admin@civicrecords.gov', status: 'PAST_DUE',  plan: 'light',   members: 7,  modulesEnabled: 1, createdAt: '2026-03-30T16:45:00Z'},
  {id: 'tn_005', name: 'Mira Therapeutics',   slug: 'mira-therapeutics',   ownerEmail: 'finance@miratx.com',     status: 'SUSPENDED', plan: 'pro',     members: 11, modulesEnabled: 0, createdAt: '2026-02-19T08:00:00Z'},
  {id: 'tn_006', name: 'Quill & Co.',         slug: 'quill-co',            ownerEmail: 'eric@quill.co',          status: 'PENDING',   plan: 'trial',   members: 1,  modulesEnabled: 0, createdAt: '2026-05-14T18:32:00Z'},
];

// ─── Tone maps ───────────────────────────────────────────────────────

const STATUS_META: Record<TenantStatus, {label: string; tone: StatusTone; pulse: boolean}> = {
  ACTIVE:    {label: 'Active',    tone: 'emerald', pulse: true},
  TRIALING:  {label: 'Trialing',  tone: 'sky',     pulse: false},
  SUSPENDED: {label: 'Suspended', tone: 'amber',   pulse: false},
  PENDING:   {label: 'Pending',   tone: 'violet',  pulse: false},
  PAST_DUE:  {label: 'Past due',  tone: 'red',     pulse: false},
  CANCELLED: {label: 'Cancelled', tone: 'zinc',    pulse: false},
};

const PLAN_META: Record<PlanKey, {label: string; tone: StatusTone}> = {
  trial:   {label: 'Trial',   tone: 'zinc'},
  light:   {label: 'Light',   tone: 'sky'},
  pro:     {label: 'Pro',     tone: 'indigo'},
  premium: {label: 'Premium', tone: 'violet'},
};

const STATUS_FILTERS: ReadonlyArray<{value: TenantStatus | 'ALL'; label: string}> = [
  {value: 'ALL',       label: 'All'},
  {value: 'ACTIVE',    label: 'Active'},
  {value: 'TRIALING',  label: 'Trialing'},
  {value: 'PAST_DUE',  label: 'Past due'},
  {value: 'SUSPENDED', label: 'Suspended'},
  {value: 'PENDING',   label: 'Pending'},
];

// ─── Page ────────────────────────────────────────────────────────────

export default function PlatformTenantsPage() {
  const [query, setQuery]       = useState('');
  const [filter, setFilter]     = useState<TenantStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<TenantRow | null>(null);
  const [pending, startTransition] = useTransition();
  const {toast} = useToast();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ROWS.filter((r) => {
      if (filter !== 'ALL' && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q)
        || r.slug.toLowerCase().includes(q)
        || r.ownerEmail.toLowerCase().includes(q)
        || r.id.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  function pretendAction(verb: string, target: string) {
    startTransition(() => {
      // Placeholder — wired to real audited backend endpoints in a follow-up.
      window.setTimeout(() => {
        toast({variant: 'info', title: `${verb} requested`, description: `${target} · audit event will land when backend is wired.`});
      }, 350);
    });
  }

  return (
    <div className="stack-page">
      <Hero total={ROWS.length} active={ROWS.filter((r) => r.status === 'ACTIVE').length} attention={ROWS.filter((r) => r.status === 'PAST_DUE' || r.status === 'SUSPENDED').length} />

      <section className="surface-translucent relative overflow-hidden">
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          filter={filter}
          onFilterChange={setFilter}
          shown={rows.length}
          total={ROWS.length}
        />

        <TenantsTable
          rows={rows}
          onSelect={setSelected}
          selectedId={selected?.id ?? null}
          pretendAction={pretendAction}
        />

        <p className="border-t border-zinc-200/55 px-6 py-3 text-[11px] text-zinc-500 dark:border-zinc-800/55 dark:text-zinc-500">
          Live tenant directory ships when <span className="font-mono">GET /v1/platform/tenants</span> is exposed.
          Mutations are gated on <span className="font-mono">platform:users:manage_customers</span>.
        </p>
      </section>

      <TenantSheet
        row={selected}
        onClose={() => setSelected(null)}
        pending={pending}
        pretendAction={pretendAction}
      />
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero({total, active, attention}: {total: number; active: number; attention: number}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/55 bg-gradient-to-br from-white/80 via-white/55 to-white/35 backdrop-blur-xl shadow-glass dark:border-zinc-800/55 dark:from-zinc-900/65 dark:via-zinc-900/40 dark:to-zinc-900/25 dark:shadow-glass-dark">
      <div className="pointer-events-none absolute inset-0 bg-grid-soft mask-radial-soft opacity-70" />
      <div className="pointer-events-none absolute -right-16 -top-32 h-[300px] w-[300px] rounded-full bg-indigo-500/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      <div className="relative grid gap-8 p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
        <div>
          <p className="section-eyebrow flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Building2 size={11} />
            Platform · tenants
          </p>
          <h1 className="t-h1 mt-3">Tenant directory.</h1>
          <p className="t-body mt-3 max-w-lg">
            Every workspace on the platform: status, plan, owner, members, enabled
            modules. Operations stay inline — suspend, restore, or email an owner
            without leaving the table.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <PeriodFilter />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <HeroStat label="Total"     value={total}     tone="indigo" />
          <HeroStat label="Active"    value={active}    tone="emerald" pulse />
          <HeroStat label="Attention" value={attention} tone="amber"  pulse={attention > 0} />
        </div>
      </div>
    </section>
  );
}

const HERO_TONE: Record<'indigo' | 'emerald' | 'amber', {text: string; bg: string}> = {
  indigo:  {text: 'text-indigo-700 dark:text-indigo-300',   bg: 'from-indigo-500/15 to-indigo-500/0'},
  emerald: {text: 'text-emerald-700 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/0'},
  amber:   {text: 'text-amber-700 dark:text-amber-400',     bg: 'from-amber-500/15 to-amber-500/0'},
};

function HeroStat({label, value, tone, pulse}: {label: string; value: number; tone: keyof typeof HERO_TONE; pulse?: boolean}) {
  const t = HERO_TONE[tone];
  return (
    <div className="surface-dock relative overflow-hidden p-4">
      {pulse && <div aria-hidden="true" className="pointer-events-none absolute inset-0 stripes-pulse opacity-25" />}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b ${t.bg} opacity-70`} />
      <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{label}</p>
      <p className={`relative mt-1 text-2xl font-bold tabular-nums tracking-tight ${t.text}`}>
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────

function Toolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  shown,
  total,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  filter: TenantStatus | 'ALL';
  onFilterChange: (f: TenantStatus | 'ALL') => void;
  shown: number;
  total: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200/55 px-6 py-4 dark:border-zinc-800/55">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200/55 bg-white/65 px-3 py-1.5 shadow-soft backdrop-blur dark:border-zinc-800/55 dark:bg-zinc-900/55">
        <Search size={13} className="text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search name, slug, owner, id…"
          className="w-56 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-100"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map(({value, label}) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-soft',
                active
                  ? 'border-indigo-200/70 bg-indigo-50/70 text-indigo-700 dark:border-indigo-800/55 dark:bg-indigo-900/25 dark:text-indigo-300'
                  : 'border-zinc-200/55 bg-white/55 text-zinc-600 hover:bg-white dark:border-zinc-800/55 dark:bg-zinc-900/55 dark:text-zinc-400 dark:hover:bg-zinc-900',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <span className="ml-auto text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-500">
        {shown} / {total}
      </span>
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────

function TenantsTable({
  rows,
  onSelect,
  selectedId,
  pretendAction,
}: {
  rows: ReadonlyArray<TenantRow>;
  onSelect: (row: TenantRow) => void;
  selectedId: string | null;
  pretendAction: (verb: string, target: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="m-6 rounded-xl border border-dashed border-zinc-200/55 bg-white/40 p-10 text-center text-xs text-zinc-500 dark:border-zinc-800/55 dark:bg-zinc-900/30 dark:text-zinc-500">
        No tenants match the current filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">
            <th className="px-6 py-2 font-semibold">Tenant</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Plan</th>
            <th className="px-3 py-2 font-semibold">Members</th>
            <th className="px-3 py-2 font-semibold">Modules</th>
            <th className="px-3 py-2 font-semibold">Created</th>
            <th className="px-6 py-2 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200/55 dark:divide-zinc-800/55">
          {rows.map((row) => {
            const status = STATUS_META[row.status];
            const plan = PLAN_META[row.plan];
            const isSelected = selectedId === row.id;
            return (
              <tr
                key={row.id}
                onClick={() => onSelect(row)}
                data-selected={isSelected ? 'true' : 'false'}
                className={cn(
                  'group cursor-pointer transition-soft',
                  isSelected
                    ? 'bg-indigo-50/40 dark:bg-indigo-900/15'
                    : 'hover:bg-white/40 dark:hover:bg-zinc-900/40',
                )}
              >
                <td className="px-6 py-3 align-middle">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-200/55 dark:text-indigo-300 dark:ring-indigo-800/55">
                      {row.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="t-h3 leading-tight">{row.name}</p>
                      <p className="t-meta-xs">{row.slug} · {row.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 align-middle">
                  <StatusPill tone={status.tone} label={status.label} pulse={status.pulse} />
                </td>
                <td className="px-3 py-3 align-middle">
                  <StatusPill tone={plan.tone} label={plan.label} />
                </td>
                <td className="px-3 py-3 align-middle">
                  <span className="t-meta">{row.members}</span>
                </td>
                <td className="px-3 py-3 align-middle">
                  <span className="t-meta">{row.modulesEnabled}</span>
                </td>
                <td className="px-3 py-3 align-middle">
                  <span className="t-meta-xs">{new Date(row.createdAt).toLocaleDateString()}</span>
                </td>
                <td className="px-6 py-3 text-right align-middle">
                  <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {row.status === 'SUSPENDED' ? (
                      <InlineAction
                        tone="primary"
                        icon={<Play size={11} />}
                        onClick={() => pretendAction('Restore', row.name)}
                      >
                        Restore
                      </InlineAction>
                    ) : (
                      <InlineAction
                        tone="danger"
                        icon={<Pause size={11} />}
                        onClick={() => pretendAction('Suspend', row.name)}
                      >
                        Suspend
                      </InlineAction>
                    )}
                    <InlineAction
                      tone="neutral"
                      icon={<ArrowUpRight size={11} />}
                      onClick={() => onSelect(row)}
                    >
                      Inspect
                    </InlineAction>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Detail Sheet ────────────────────────────────────────────────────

function TenantSheet({
  row,
  onClose,
  pending,
  pretendAction,
}: {
  row: TenantRow | null;
  onClose: () => void;
  pending: boolean;
  pretendAction: (verb: string, target: string) => void;
}) {
  const open = row !== null;
  if (!row) {
    return <Sheet open={open} onClose={onClose} title="Tenant detail" width="lg">{null}</Sheet>;
  }

  const status = STATUS_META[row.status];
  const plan = PLAN_META[row.plan];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={row.name}
      description={`${row.slug} · ${row.id}`}
      width="lg"
      dismissable={!pending}
    >
      <SheetBody>
        {/* Status strip */}
        <div className="flex flex-wrap items-center gap-2 pb-4">
          <StatusPill tone={status.tone} label={status.label} pulse={status.pulse} size="md" />
          <StatusPill tone={plan.tone} label={`Plan · ${plan.label}`} size="md" />
          <span className="t-meta-xs ml-auto inline-flex items-center gap-1">
            <CalendarDays size={11} />
            Created {new Date(row.createdAt).toLocaleString()}
          </span>
        </div>

        <SheetSection eyebrow="Identity" title="Owner and contact">
          <div className="divide-y divide-zinc-200/55 dark:divide-zinc-800/55">
            <SheetRow icon={Mail} label="Owner email" value={row.ownerEmail}>
              <InlineAction
                icon={<Copy size={11} />}
                onClick={() => copy(row.ownerEmail)}
              >
                Copy
              </InlineAction>
            </SheetRow>
            <SheetRow icon={Building2} label="Tenant slug" value={row.slug}>
              <InlineAction
                icon={<Copy size={11} />}
                onClick={() => copy(row.slug)}
              >
                Copy
              </InlineAction>
            </SheetRow>
          </div>
        </SheetSection>

        <SheetSection eyebrow="Usage" title="Members & modules">
          <div className="divide-y divide-zinc-200/55 dark:divide-zinc-800/55">
            <SheetRow icon={Users} label="Members" value={`${row.members} seat${row.members === 1 ? '' : 's'}`}>
              <Link
                href={`#members-${row.id}`}
                className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                View
              </Link>
            </SheetRow>
            <SheetRow icon={Boxes} label="Modules enabled" value={`${row.modulesEnabled}`}>
              <Link
                href="/platform/modules"
                className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Catalog
              </Link>
            </SheetRow>
            <SheetRow icon={CreditCard} label="Billing" value={`${plan.label} plan`}>
              <Link
                href="/platform/billing"
                className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Open billing
              </Link>
            </SheetRow>
          </div>
        </SheetSection>

        <SheetSection eyebrow="Governance" title="Audited actions">
          <p className="t-small">
            Suspending or restoring a tenant writes to the audit ledger
            under <span className="font-mono">platform.tenants.*</span>.
            Operations are reversible.
          </p>
        </SheetSection>
      </SheetBody>

      <SheetFooter>
        <InlineAction
          tone="neutral"
          size="md"
          icon={<ShieldAlert size={12} />}
          onClick={() => pretendAction('Audit lookup', row.name)}
        >
          Audit history
        </InlineAction>
        <span className="flex-1" />
        {row.status === 'SUSPENDED' ? (
          <InlineAction
            tone="primary"
            size="md"
            pending={pending}
            icon={<Play size={12} />}
            onClick={() => pretendAction('Restore', row.name)}
          >
            Restore tenant
          </InlineAction>
        ) : (
          <InlineAction
            tone="danger"
            size="md"
            pending={pending}
            icon={<Pause size={12} />}
            onClick={() => pretendAction('Suspend', row.name)}
          >
            Suspend tenant
          </InlineAction>
        )}
      </SheetFooter>
    </Sheet>
  );
}

function SheetRow({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
          <Icon size={12} />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">{label}</span>
          <span className="block truncate text-[13px] font-medium text-zinc-800 dark:text-zinc-200">{value}</span>
        </span>
      </span>
      {children && <span className="shrink-0">{children}</span>}
    </div>
  );
}

function copy(value: string) {
  try {
    navigator.clipboard.writeText(value);
  } catch {
    // Browser may block clipboard write — silent failure is acceptable here.
  }
}

// Used by InlineAction icon imports — keep the lucide tree-shake happy.
void CheckCircle2;

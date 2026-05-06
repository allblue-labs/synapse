'use client';

import {useState} from 'react';
import {Sun, Moon, Monitor, Shield, CreditCard, User, Settings as SettingsIcon} from 'lucide-react';
import {useTheme} from 'next-themes';
import {cn} from '@/lib/utils';
import {PageHeader} from '@/components/ui/page-header';

const SECTIONS = [
  {id: 'profile',     label: 'Profile',     icon: User},
  {id: 'appearance',  label: 'Appearance',  icon: Sun},
  {id: 'security',    label: 'Security',    icon: Shield},
  {id: 'billing',     label: 'Billing',     icon: CreditCard},
] as const;

type SectionId = typeof SECTIONS[number]['id'];

function SectionNav({active, onChange}: {active: SectionId; onChange: (s: SectionId) => void}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {SECTIONS.map(({id, label, icon: Icon}) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left',
            active === id
              ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
              : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200',
          )}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </nav>
  );
}

function ProfileSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Profile</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Your account information.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-soft dark:border-zinc-800 dark:bg-zinc-900">
        <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />
        <div className="relative divide-y divide-zinc-100 dark:divide-zinc-800">
          {[
            {label: 'Name',         value: 'Administrator'},
            {label: 'Email',        value: 'admin@synapse.ai'},
            {label: 'Role',         value: 'Owner'},
            {label: 'Tenant',       value: 'My Organization'},
          ].map(({label, value}) => (
            <div key={label} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        To update your profile, contact your administrator.
      </p>
    </div>
  );
}

function AppearanceSection() {
  const {theme, setTheme} = useTheme();

  const OPTIONS = [
    {value: 'light',  label: 'Light',  icon: Sun},
    {value: 'dark',   label: 'Dark',   icon: Moon},
    {value: 'system', label: 'System', icon: Monitor},
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Appearance</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Choose how Synapse looks to you.
        </p>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Theme
        </p>
        <div className="grid grid-cols-3 gap-3">
          {OPTIONS.map(({value, label, icon: Icon}) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                'group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border p-6 text-sm font-medium transition-all',
                theme === value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-soft dark:border-brand-400 dark:bg-brand-900/20 dark:text-brand-300'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-soft dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700',
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-30" />
              <Icon size={22} className="relative" />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaceholderSection({title, description}: {title: string; description: string}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">Coming soon</p>
        <p className="mt-1 text-xs text-zinc-300 dark:text-zinc-600">
          This section is not yet available.
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>('profile');

  return (
    <div className="animate-fade-in space-y-10">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your account and platform preferences."
        icon={<SettingsIcon size={26} />}
        iconGradient="from-zinc-700 to-zinc-500"
        glowColor="bg-zinc-500/15"
      />

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        {/* Sidebar nav */}
        <div className="lg:w-48 lg:shrink-0">
          <SectionNav active={active} onChange={setActive} />
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {active === 'profile'    && <ProfileSection />}
          {active === 'appearance' && <AppearanceSection />}
          {active === 'security'   && (
            <PlaceholderSection
              title="Security"
              description="Manage your password, two-factor authentication and active sessions."
            />
          )}
          {active === 'billing'    && (
            <PlaceholderSection
              title="Billing"
              description="View your subscription plan, usage and invoices."
            />
          )}
        </div>
      </div>
    </div>
  );
}

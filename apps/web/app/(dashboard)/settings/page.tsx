import { Cable, CreditCard, Database, Shield } from 'lucide-react';

const settings = [
  { title: 'Tenant isolation', detail: 'JWT tenant claims and tenant-scoped service methods.', icon: Shield },
  { title: 'Channels', detail: 'Telegram first, with WhatsApp and Discord behind the adapter contract.', icon: Cable },
  { title: 'Billing', detail: 'Stripe customer and subscription state will live behind entitlements.', icon: CreditCard },
  { title: 'Data', detail: 'PostgreSQL owns source-of-truth data. Redis powers queues and delivery.', icon: Database }
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase text-signal">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">Workspace controls</h1>
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        {settings.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.title} className="rounded-md border border-ink/10 bg-white p-5 shadow-panel">
              <Icon className="h-5 w-5 text-signal" aria-hidden="true" />
              <h2 className="mt-4 font-semibold text-ink">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-graphite/70">{item.detail}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}

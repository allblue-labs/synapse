import { Check, KeyRound, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const steps = [
  { title: 'Create your workspace', detail: 'Tenant, owner, and starter billing profile are created by the API.', done: true, icon: Check },
  { title: 'Configure first agent', detail: 'Set the business goal, personality, rules, and knowledge scope.', done: false, icon: Sparkles },
  { title: 'Connect Telegram', detail: 'Use the first channel adapter to validate inbound and outbound flow.', done: false, icon: MessageCircle },
  { title: 'Secure production keys', detail: 'Move provider credentials into managed secrets before launch.', done: false, icon: KeyRound }
];

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-md border border-ink/10 bg-white p-6 shadow-panel md:p-8">
        <p className="text-sm font-medium uppercase text-signal">Onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">Launch a tenant without exposing the machinery</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-graphite/70">
          The first-run path focuses on one working agent, one working channel, and enough knowledge to produce useful responses.
        </p>
      </section>

      <section className="rounded-md border border-ink/10 bg-white shadow-panel">
        <div className="divide-y divide-ink/10">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div key={step.title} className="grid gap-4 px-6 py-5 md:grid-cols-[56px_1fr_150px] md:items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-mist">
                  <Icon className={step.done ? 'h-5 w-5 text-signal' : 'h-5 w-5 text-graphite'} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-ink">{index + 1}. {step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-graphite/70">{step.detail}</p>
                </div>
                <Button variant={step.done ? 'secondary' : 'primary'}>{step.done ? 'Review' : 'Start'}</Button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

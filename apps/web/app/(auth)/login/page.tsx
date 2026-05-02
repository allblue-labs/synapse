import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh bg-pearl lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex items-center px-6 py-10 md:px-12">
        <div className="w-full max-w-md">
          <Image src="/synapse-logo.PNG" alt="Synapse" width={44} height={44} className="h-11 w-11 rounded-md object-cover" priority />
          <h1 className="mt-8 text-4xl font-semibold tracking-normal text-ink">Sign in to Synapse</h1>
          <p className="mt-3 text-sm leading-6 text-graphite/70">Access agent operations, conversations, lead signals, and billing controls.</p>
          <form className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-graphite">Email</span>
              <input className="mt-2 h-11 w-full rounded-md border border-ink/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ink/15" type="email" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-graphite">Password</span>
              <input className="mt-2 h-11 w-full rounded-md border border-ink/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ink/15" type="password" />
            </label>
            <Button className="w-full">
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </section>
      <section className="hidden bg-ink p-10 text-white lg:flex lg:items-end">
        <div>
          <p className="text-sm font-medium text-signal">Business conversations, operationalized</p>
          <p className="mt-4 max-w-xl text-4xl font-semibold tracking-normal">
            Premium agent workflows for teams that care about outcomes, not chatbot theater.
          </p>
        </div>
      </section>
    </main>
  );
}

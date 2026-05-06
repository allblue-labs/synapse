'use client';

import {useState, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {ArrowLeft, ArrowRight, CheckCircle2, Sparkles} from 'lucide-react';
import {SynapseBgDark} from '@/components/background/synapse-bg';
import {api} from '@/lib/api';

const FEATURES = [
  'Connect WhatsApp, Telegram & web chat in minutes',
  'Deploy AI agents with custom tools and knowledge',
  'Capture appointments and leads as structured data',
  'Monitor every conversation with full audit trails',
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const {accessToken} = await api.auth.login(email, password);
      document.cookie = `synapse_token=${encodeURIComponent(accessToken)};path=/;max-age=86400;SameSite=Lax`;
      router.push('/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-950">

      {/* ══════════════════════════════════════════════════
          LEFT — premium brand panel
      ══════════════════════════════════════════════════ */}
      <aside className="relative hidden w-[520px] shrink-0 flex-col justify-between overflow-hidden bg-zinc-950 p-12 text-white lg:flex">
        <SynapseBgDark />

        {/* Logo */}
        <Link href="/" className="relative z-10 inline-flex items-center gap-2.5 self-start">
          <Image
            src="/logo.png"
            alt="Synapse"
            width={36}
            height={36}
            className="rounded-lg ring-1 ring-white/10"
            priority
          />
          <span className="text-base font-bold tracking-tight">Synapse</span>
        </Link>

        {/* Body */}
        <div className="relative z-10">
          <div className="pill-brand !border-white/15 !bg-white/5 !text-white/90 backdrop-blur">
            <Sparkles size={11} />
            AI agents for modern teams
          </div>

          <h2 className="mt-6 text-balance text-[2.25rem] font-bold leading-[1.1] tracking-tight">
            Build conversations that<br />
            <span className="text-gradient">drive revenue.</span>
          </h2>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-400">
            Synapse is the orchestration platform for AI-powered messaging.
            Connect channels, deploy agents, automate workflows.
          </p>

          <ul className="mt-9 space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-400" />
                <span className="text-[14px] leading-relaxed text-zinc-300">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial mini */}
        <div className="relative z-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <p className="text-sm leading-relaxed text-zinc-300">
            &ldquo;We replaced two SaaS tools with one Synapse workspace. Our agents now respond in under a second.&rdquo;
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold">
              R
            </div>
            <div className="text-xs">
              <p className="font-semibold text-white">Renata Costa</p>
              <p className="text-zinc-500">Head of Operations · Northstar Clinic</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════
          RIGHT — form panel
      ══════════════════════════════════════════════════ */}
      <main className="relative flex flex-1 items-center justify-center px-6 py-12">

        {/* Top-right: back to home */}
        <Link
          href="/"
          className="absolute right-6 top-6 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <ArrowLeft size={13} />
          Back home
        </Link>

        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Image src="/logo.png" alt="Synapse" width={32} height={32} className="rounded-lg ring-1 ring-black/5 dark:ring-white/10" priority />
            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Synapse</span>
          </div>

          {/* Header */}
          <div className="mb-9">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Welcome back
            </h1>
            <p className="mt-2 text-[15px] text-zinc-500 dark:text-zinc-400">
              Sign in to continue to your workspace.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-soft outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-brand-400"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Password
                </label>
                <a
                  href="mailto:hello@synapse.ai"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Forgot?
                </a>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-soft outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-brand-400"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/60 dark:bg-red-900/20">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">!</span>
                <p className="text-sm leading-snug text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 text-sm font-semibold text-white shadow-soft transition-all hover:bg-zinc-800 hover:shadow-card active:scale-[0.99] disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign in to Synapse
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-10 border-t border-zinc-100 pt-6 dark:border-zinc-800">
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              New to Synapse?{' '}
              <a
                href="mailto:hello@synapse.ai"
                className="font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Request access
              </a>
            </p>
          </div>

          {/* Legal microcopy */}
          <p className="mt-8 text-center text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-600">
            By signing in, you agree to our{' '}
            <a href="#" className="underline-offset-2 hover:underline">Terms</a> &{' '}
            <a href="#" className="underline-offset-2 hover:underline">Privacy Policy</a>.
          </p>

        </div>
      </main>
    </div>
  );
}

import { PlatformNav } from '@/components/app-shell/platform-nav';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-pearl text-ink surface-grid">
      <PlatformNav />
      <main className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-9">{children}</main>
    </div>
  );
}

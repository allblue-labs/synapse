import { cn } from '@/lib/utils';

type BadgeProps = {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'info';
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md px-2 text-xs font-medium',
        tone === 'neutral' && 'bg-ink/6 text-graphite',
        tone === 'success' && 'bg-signal/12 text-signal',
        tone === 'warning' && 'bg-ember/12 text-ember',
        tone === 'info' && 'bg-pulse/10 text-pulse'
      )}
    >
      {children}
    </span>
  );
}

import { cn } from '@/lib/utils';

type MetricProps = {
  label: string;
  value: string;
  detail: string;
  className?: string;
};

export function Metric({ label, value, detail, className }: MetricProps) {
  return (
    <div className={cn('border-r border-ink/10 px-6 last:border-r-0', className)}>
      <p className="text-xs font-medium uppercase text-graphite/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal text-ink">{value}</p>
      <p className="mt-1 text-sm text-graphite/70">{detail}</p>
    </div>
  );
}

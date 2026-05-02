import { LucideIcon } from 'lucide-react';
import { Button } from './button';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
};

export function EmptyState({ icon: Icon, title, description, actionLabel }: EmptyStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-ink/15 bg-white px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-mist">
        <Icon className="h-5 w-5 text-signal" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-graphite/70">{description}</p>
      {actionLabel ? (
        <Button className="mt-5" variant="secondary">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

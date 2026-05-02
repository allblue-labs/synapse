import { FlaskConical } from 'lucide-react';

export function SampleDataBanner() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-pulse/20 bg-pulse/5 px-4 py-3">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-pulse" aria-hidden="true" />
      <p className="text-sm leading-6 text-graphite">
        This screen is using temporary product sample data until API-backed workspace state is connected.
      </p>
    </div>
  );
}

import {cn} from '@/lib/utils';

/**
 * Skeleton — placeholder block for content that is loading.
 *
 * Refined for Stage 3: pairs the base opacity pulse (`animate-skeleton`)
 * with the `shimmer-overlay` sheen so loading states feel intentional
 * rather than dormant. Reduced-motion users get a static block via the
 * global motion override.
 */
export function Skeleton({className}: {className?: string}) {
  return (
    <div
      className={cn(
        'shimmer-overlay relative overflow-hidden rounded-md bg-zinc-200/70 dark:bg-zinc-800/70',
        'animate-skeleton',
        className,
      )}
    />
  );
}

export function TableRowSkeleton({cols = 6}: {cols?: number}) {
  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      {Array.from({length: cols}).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

import {cn} from '@/lib/utils';

export function Skeleton({className}: {className?: string}) {
  return (
    <div
      className={cn(
        'animate-skeleton rounded-md bg-zinc-200 dark:bg-zinc-800',
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

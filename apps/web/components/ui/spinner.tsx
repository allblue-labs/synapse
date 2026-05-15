import {cn} from '@/lib/utils';

/**
 * Spinner — small inline loading indicator.
 *
 *   - CSS-only (no JS, no motion library).
 *   - Sized via the `--spinner-size` custom property; pass `size` in
 *     pixels for the most common values.
 *   - Inherits `currentColor`, so wrap in a tone class (e.g.
 *     `text-brand-500`, `text-zinc-400`) to recolour it.
 *   - Honours `prefers-reduced-motion` via the global override in
 *     `globals.css` (the spin animation is paused to 0.001ms).
 */
export interface SpinnerProps {
  /** Pixel size — applied via the `--spinner-size` CSS variable. Defaults to 14. */
  size?: number;
  /** Optional className for tone or layout. */
  className?: string;
  /** ARIA label for screen readers. Defaults to "Loading…". */
  label?: string;
}

export function Spinner({size = 14, className, label = 'Loading…'}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('spinner-ring', className)}
      style={{['--spinner-size' as string]: `${size}px`} as React.CSSProperties}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}

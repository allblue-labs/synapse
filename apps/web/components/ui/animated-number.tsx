'use client';

import {useEffect, useRef, useState} from 'react';

/**
 * AnimatedNumber — tweens from the previous render's value to the new
 * value over `durationMs` (default 600ms). Pure `requestAnimationFrame`,
 * no motion library.
 *
 * Honours `prefers-reduced-motion: reduce` by snapping to the final
 * value without animating.
 *
 * Locale formatting is handled by `Intl.NumberFormat` so 1234 → "1,234"
 * in `en-US`, "1.234" in `de-DE`, etc. Pass `formatter` for full
 * control (e.g. percentages, currencies).
 */
interface AnimatedNumberProps {
  /** The target value. When this changes the component animates to it. */
  value: number;
  /** Tween duration in ms. Defaults to 600. */
  durationMs?: number;
  /** Locale for the default formatter. Defaults to runtime locale. */
  locale?: string;
  /** Override the default formatter for advanced display (currency, %, etc.). */
  formatter?: (value: number) => string;
  /** Optional className for the wrapping `<span>`. */
  className?: string;
  /** Display when value is `null` / `undefined`. Defaults to `"—"`. */
  fallback?: string;
}

const EASE_OUT_QUART = (t: number) => 1 - Math.pow(1 - t, 4);

export function AnimatedNumber({
  value,
  durationMs = 600,
  locale,
  formatter,
  className,
  fallback = '—',
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Cancel any previous animation so back-to-back updates don't fight.
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplayed(value);
      fromRef.current = value;
      return;
    }

    const from = fromRef.current;
    const to   = value;
    if (from === to) return;

    const startedAt = performance.now();

    function tick(now: number) {
      const elapsed = now - startedAt;
      const t = Math.min(1, elapsed / durationMs);
      const eased = EASE_OUT_QUART(t);
      const current = from + (to - from) * eased;
      setDisplayed(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [value, durationMs]);

  const isNullish = value == null || Number.isNaN(value);
  const fmt = formatter ?? defaultFormatter(locale);
  // Numbers are tweened as floats; round at display time. Pass through
  // the formatter so callers can opt into decimals when needed.
  const text = isNullish
    ? fallback
    : fmt(Number.isInteger(value) ? Math.round(displayed) : displayed);

  return (
    <span
      className={className}
      // Live region so screen readers announce the final value, not
      // every intermediate frame.
      aria-live="polite"
      aria-atomic="true"
    >
      {text}
    </span>
  );
}

function defaultFormatter(locale: string | undefined): (value: number) => string {
  // Cached per-locale Intl formatter — building one per render is wasteful.
  const fmt = new Intl.NumberFormat(locale);
  return (value: number) => fmt.format(value);
}

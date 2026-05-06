/**
 * SynapseBg — premium layered hero background.
 * Composed of: base color, mesh gradient, faded grid pattern, and glow orbs.
 * Pure CSS (no canvas) — performant, no layout shift, looks polished at any size.
 */
export function SynapseBg() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Mesh gradient — soft color blobs */}
      <div className="absolute inset-0 bg-hero-mesh" />

      {/* Grid overlay with radial mask (vignette toward edges) */}
      <div className="absolute inset-0 bg-grid mask-radial opacity-80" />

      {/* Top-left glow orb */}
      <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-brand-500/20 blur-3xl dark:bg-brand-500/30" />

      {/* Top-right accent orb */}
      <div className="absolute -right-32 top-12 h-[380px] w-[380px] rounded-full bg-accent-400/10 blur-3xl dark:bg-accent-400/20" />

      {/* Bottom fade so content sits cleanly */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-white dark:to-zinc-950" />
    </div>
  );
}

/**
 * SynapseBgDark — dark variant for brand panels (login left side).
 */
export function SynapseBgDark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-mesh-dark" />
      <div className="absolute inset-0 bg-grid-dark-masked opacity-60" />
      <div className="absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-brand-500/30 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-indigo-500/20 blur-3xl" />
    </div>
  );
}

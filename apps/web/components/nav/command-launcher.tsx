'use client';

import {Command, Search} from 'lucide-react';
import {CommandPalette, useCommandPalette} from './command-palette';

/**
 * CommandLauncher — small drop-in trigger that owns its own palette
 * state. Used in shells where the top-bar is a server component (e.g.
 * the platform admin layout) and we still want ⌘K everywhere.
 */
export function CommandLauncher() {
  const palette = useCommandPalette();

  return (
    <>
      <button
        type="button"
        onClick={() => palette.setOpen(true)}
        className="hidden h-9 items-center gap-2 rounded-lg border border-zinc-200/80 bg-white/60 px-3 text-sm text-zinc-500 shadow-soft transition-all duration-200 ease-snap hover:-translate-y-px hover:bg-white hover:text-zinc-900 hover:shadow-card sm:flex dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
      >
        <Search size={13} />
        <span className="text-xs">Search</span>
        <span className="ml-1 flex items-center gap-0.5 rounded border border-zinc-200 bg-white px-1 py-0.5 text-[10px] font-mono text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
          <Command size={9} />K
        </span>
      </button>
      <CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} />
    </>
  );
}

'use client';

import {cn} from '@/lib/utils';
import {X} from 'lucide-react';
import {useEffect, type ReactNode} from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export function Sheet({open, onClose, title, children, width = 'lg'}: SheetProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm dark:bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl dark:bg-zinc-900 animate-slide-up',
          {
            'w-full max-w-md': width === 'md',
            'w-full max-w-2xl': width === 'lg',
            'w-full max-w-4xl': width === 'xl',
          },
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          {title && (
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}

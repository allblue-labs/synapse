import { Bell, Command, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SynapseLogo } from './logo';

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-pearl/90 px-4 py-3 backdrop-blur md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="lg:hidden">
          <SynapseLogo />
        </div>
        <div className="hidden h-10 min-w-0 flex-1 items-center gap-3 rounded-md border border-ink/10 bg-white px-3 text-sm text-graphite/60 md:flex">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Search conversations, agents, leads</span>
          <kbd className="ml-auto inline-flex h-6 items-center gap-1 rounded border border-ink/10 px-2 text-xs">
            <Command className="h-3 w-3" aria-hidden="true" />K
          </kbd>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-10 w-10 px-0" title="Notifications">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New agent
          </Button>
        </div>
      </div>
    </header>
  );
}

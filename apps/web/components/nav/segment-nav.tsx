'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ChevronRight} from 'lucide-react';
import {cn} from '@/lib/utils';

/**
 * Map of route slugs to display labels.
 * Add new routes here so they appear nicely in the segment nav.
 */
const ROUTE_LABELS: Record<string, string> = {
  // Top-level zones
  workspace:     'Workspace',
  platform:      'Platform',

  // Workspace surfaces
  overview:      'Overview',
  modules:       'Modules',
  agents:        'Agents',
  activity:      'Activity',
  settings:      'Settings',
  billing:       'Billing',
  team:          'Team',

  // Pulse module surfaces
  pulse:         'Pulse',
  inbox:         'Inbox',
  tickets:       'Tickets',
  timeline:      'Timeline',
  playbooks:     'Playbooks',
  knowledge:     'Knowledge',
  catalog:       'Catalog',
  campaigns:     'Campaigns',
  integrations:  'Integrations',
  metrics:       'Metrics',
  logs:          'Logs',

  // Platform admin surfaces
  tenants:       'Tenants',
  flags:         'Feature Flags',
  audit:         'Audit',
  runtime:       'Runtime',

  // Generic
  conversations: 'Conversations',
  channels:      'Channels',
  automations:   'Automations',
  leads:         'Leads',
};

function labelFor(slug: string): string {
  return ROUTE_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
}

/**
 * SegmentNav — breadcrumb-style "you are here" indicator.
 * Renders only when the user is in a sub-route (≥ 2 segments).
 * Sits below the TopNav and feels like a continuation of it.
 */
export function SegmentNav() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Hide on top-level routes — TopNav already shows the active segment.
  if (segments.length < 2) return null;

  // Build cumulative paths
  const trail = segments.map((slug, idx) => ({
    label: labelFor(slug),
    href:  '/' + segments.slice(0, idx + 1).join('/'),
    isLast: idx === segments.length - 1,
  }));

  return (
    <div className="relative border-b border-zinc-200/70 bg-white/60 backdrop-blur-sm dark:border-zinc-800/70 dark:bg-zinc-950/60">
      {/* subtle grid texture on the bar — Linear-style */}
      <div className="pointer-events-none absolute inset-0 bg-grid-micro opacity-50 mask-fade-x" />

      <div className="container-shell relative flex h-11 items-center px-6 lg:px-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 overflow-x-auto">
          <ol className="flex items-center gap-1 whitespace-nowrap">
            {trail.map(({label, href, isLast}, idx) => (
              <li key={href} className="flex items-center gap-1">
                {idx > 0 && (
                  <ChevronRight
                    size={12}
                    className="shrink-0 text-zinc-300 dark:text-zinc-700"
                    aria-hidden="true"
                  />
                )}
                {isLast ? (
                  <span
                    aria-current="page"
                    className="rounded-md bg-zinc-100/90 px-2.5 py-1 text-xs font-semibold text-zinc-900 ring-1 ring-zinc-200/70 dark:bg-zinc-800/80 dark:text-zinc-100 dark:ring-zinc-700/70"
                  >
                    {label}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      'text-zinc-500 hover:bg-zinc-100/70 hover:text-zinc-900',
                      'dark:text-zinc-500 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-200',
                    )}
                  >
                    {label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}

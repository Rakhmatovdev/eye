import type { WatchlistEntry } from '../lib/api';

// Demo fallback for the Watchlist page when the API is unreachable.
// ent-009 and ent-011 are the seeded watchlist entries (see MEMORY.md /
// backend seed data) — kept consistent here for a believable demo state.
export const mockWatchlist: WatchlistEntry[] = [
  {
    id: 'wl-mock-001',
    entity_id: 'ent-009',
    entity_label: 'Timur Umarov',
    note: 'High-priority narcotics target; linked to hostile convoy track HOSTILE-01 (t-001).',
    created_by: 'admin@platform.io',
    created_at: new Date(Date.now() - 6 * 24 * 3600_000).toISOString(),
  },
  {
    id: 'wl-mock-002',
    entity_id: 'ent-011',
    entity_label: 'Hassan Al-Rashidi',
    note: 'Terrorism-finance nexus; frequent Tashkent visitor under SIGINT-12 coverage.',
    created_by: 'admin@platform.io',
    created_at: new Date(Date.now() - 3 * 24 * 3600_000).toISOString(),
  },
];

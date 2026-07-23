import type { GraphStats } from '../lib/api';

// Demo fallback for the graph "Network Stats" panel when the API is
// unreachable.
export const mockGraphStats: GraphStats = {
  top_connected: [
    { entity_id: 'ent-001', label: 'Alisher Karimov', type: 'person', degree: 3 },
    { entity_id: 'ent-002', label: 'Zhang Wei', type: 'person', degree: 2 },
    { entity_id: 'ent-013', label: 'Silk Road Trading LLC', type: 'organization', degree: 2 },
    { entity_id: 'ent-014', label: 'Dragon Capital Investment', type: 'organization', degree: 2 },
    { entity_id: 'ent-003', label: 'Rustam Nazarov', type: 'person', degree: 1 },
    { entity_id: 'ent-005', label: 'Bekzod Toshmatov', type: 'person', degree: 1 },
  ],
  total_nodes: 18,
  total_edges: 10,
};

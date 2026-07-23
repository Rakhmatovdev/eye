import type { Pattern } from '../lib/api';

// Demo fallback for the AI Patterns dashboard card / /patterns page when the
// API is unreachable.
export const mockPatterns: Pattern[] = [
  {
    id: 'pat-mock-threat',
    type: 'threat_correlation',
    score: 85,
    title: 'Threat linked to watchlisted entity',
    description: 'Track HOSTILE-01 (convoy) (classification: hostile) is linked to entity Timur Umarov, which is watchlisted.',
    entity_ids: ['ent-009'],
    evidence: ['threat_id=t-001 classification=hostile entity_id=ent-009'],
    detected_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: 'pat-mock-hub',
    type: 'hub_entity',
    score: 64,
    title: 'Hub entity: Alisher Karimov',
    description: "Alisher Karimov has 3 relationships, at least 2x the graph's mean degree of 1.3.",
    entity_ids: ['ent-001'],
    evidence: ['degree=3 mean_degree=1.33'],
    detected_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
  },
  {
    id: 'pat-mock-colocation',
    type: 'co_location',
    score: 58,
    title: 'Co-location: Karimov & Nazarov',
    description: 'Alisher Karimov and Rustam Nazarov were sighted at Samarkand Registon Hotel within the same time window.',
    entity_ids: ['ent-001', 'ent-003'],
    evidence: ['location=ent-029 window=2024-03-12'],
    detected_at: new Date(Date.now() - 8 * 3600_000).toISOString(),
  },
  {
    id: 'pat-mock-burst',
    type: 'burst_activity',
    score: 47,
    title: 'Burst activity: Dostuk Border Crossing',
    description: 'Sensor detection volume at Dostuk Border Crossing spiked 3x over the trailing 24h baseline.',
    entity_ids: ['ent-027'],
    evidence: ['detections_24h=23 baseline=7'],
    detected_at: new Date(Date.now() - 14 * 3600_000).toISOString(),
  },
];

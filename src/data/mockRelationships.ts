export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  properties?: Record<string, string | number>;
}

export const mockRelationships: Relationship[] = [
  { id: 'rel-001', source: 'ent-001', target: 'ent-002', type: 'associate', label: 'Business Partner' },
  { id: 'rel-002', source: 'ent-001', target: 'ent-003', type: 'manager', label: 'Directs Logistics' },
  { id: 'rel-003', source: 'ent-002', target: 'ent-003', type: 'contact', label: 'Encrypted Contact' },
  { id: 'rel-004', source: 'ent-001', target: 'ent-004', type: 'owns', label: 'Primary SIM Card' },
  { id: 'rel-005', source: 'ent-002', target: 'ent-005', type: 'owns', label: 'Secondary SIM Card' },
  { id: 'rel-006', source: 'ent-003', target: 'ent-006', type: 'drives', label: 'Registered Driver' },
];

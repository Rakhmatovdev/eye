export interface TimelineEvent {
  id: string;
  timestamp: string;
  entity_id: string;
  title: string;
  description: string;
  type: string;
  location?: string;
}

export const mockEvents: TimelineEvent[] = [
  { id: 'ev-001', timestamp: '2024-06-01T08:00:00Z', entity_id: 'ent-001', title: 'Departed Tashkent Airport', description: 'Crossed border flight flight UZ-204 to Almaty', type: 'travel', location: 'Tashkent, UZ' },
  { id: 'ev-002', timestamp: '2024-06-01T10:30:00Z', entity_id: 'ent-001', title: 'Arrived Almaty Airport', description: 'Border check visa scan cleared', type: 'travel', location: 'Almaty, KZ' },
  { id: 'ev-003', timestamp: '2024-06-02T14:15:00Z', entity_id: 'ent-002', title: 'Suspicious Bank Transaction', description: 'Wire transfer of $50,000 to Silk Road Trading LLC', type: 'financial', location: 'Almaty, KZ' },
  { id: 'ev-004', timestamp: '2024-06-03T18:00:00Z', entity_id: 'ent-003', title: 'Registered SIM Handshake', description: 'SIM +998712345678 active on cell tower 442', type: 'telecom', location: 'Samarkand, UZ' },
  { id: 'ev-005', timestamp: '2024-06-05T09:00:00Z', entity_id: 'ent-001', title: 'Meeting Registered', description: 'Physical surveillance reports meeting between Karimov and Wei', type: 'meeting', location: 'Almaty, KZ' },
];

export interface Case {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  entityCount: number;
  created_at: string;
}

export const mockCases: Case[] = [
  { id: 'case-01', title: 'Silk Road Customs Ingest Correlator', description: 'Track cross-border smuggling networks and trade compliance discrepancies between Tashkent and Almaty.', status: 'in-progress', priority: 'high', assignee: 'John Analyst', entityCount: 12, created_at: '2024-05-10' },
  { id: 'case-02', title: 'Almaty Telecom Surveillance Mapping', description: 'Geospatial signal handshakes mapping and cell-tower trace coordinates correlating suspected SIM cards.', status: 'open', priority: 'critical', assignee: 'John Analyst', entityCount: 8, created_at: '2024-06-02' },
  { id: 'case-03', title: 'Tashkent Financial Laundering Syndicate', description: 'Investigating trade misinvoicing and money laundering channels via front commercial companies.', status: 'open', priority: 'medium', assignee: 'Elena Petrova', entityCount: 5, created_at: '2024-06-15' },
];

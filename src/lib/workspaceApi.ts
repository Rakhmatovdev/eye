import client, { unwrap, type Envelope } from './apiClient';

export interface Participant { id: string; name: string; role: string }
export interface CasePresence { user_id:string;name:string;area:'graph'|'board'|'evidence'|'reports'|'research'|'discussion'|'diagnostics'|'operations';expires_at:string }
export interface DeadlinePolicy { due_at:string|null;escalate_after_hours:number;enabled:boolean;updated_by?:string }
export interface GeneratedReportDraft {summary:string;evidence_ids:string[];truncated:boolean;classification:string}
export interface LinkSuggestion {id:string;from_id:string;to_id:string;from_name:string;to_name:string;reasons:{field:string;value:string}[]}
export interface CaseWorkspace { participants: Participant[]; can_write: boolean; can_review: boolean }
export interface CaseAccess { classification: string; project_id?: string; can_read: boolean; can_write: boolean; can_review: boolean; can_export: boolean; clearance: number; participants: Participant[] }
export interface EvidenceVerification { id: string; status: 'verified'|'mismatch'|'unrecorded'; expected_sha256?: string; actual_sha256: string }
export interface EvidenceClaim { entity_id: string; field: string; value: string; valid_from?: string; valid_to?: string }
export interface EvidenceInput { title: string; source: string; conclusion: string; reliability: 'unassessed' | 'low' | 'medium' | 'high'; assessment: 'observation' | 'inference' | 'disputed'; attachment_ids: string[]; claims?: EvidenceClaim[] }
export interface ClaimConflict { id: string; fingerprint: string; entity_id: string; field: string; sides: { evidence_id: string; title: string; source: string; claim: EvidenceClaim }[]; status: 'open'|'confirmed'|'dismissed'|'resolved'; reason?: string; reviewed_by?: string; reviewed_at?: string }
export interface CaseDiagnostics { description?: string; updated_at?:string; score: number; checks: { key: string; passed: boolean; missing: number; tab: string }[]; conflicts: ClaimConflict[]; truncated: boolean; evidence_count: number; claims_count: number }
export interface Evidence extends Omit<EvidenceInput, 'attachment_ids'> { id: string; case_id: string; classification: string; created_by: string; created_at: string; files: { id: string; filename: string; sha256: string }[] }
export interface CaseComment { id: string; body: string; author: Participant; mentions: Participant[]; created_at: string }
export interface ReportVersion { id: string; case_id: string; version: number; title: string; summary: string; evidence: Evidence[]; classification: string; sha256: string; status: 'draft' | 'approved' | 'changes_requested'; created_by: string; created_at: string; reviewed_by?: string; reviewed_at?: string; review_comment?: string }
export type Widget = 'stats' | 'cases' | 'alerts' | 'patterns' | 'tools';
export interface WorkspacePreferences { widgets: Widget[]; pinned_project_ids: string[] }
export const defaultPreferences: WorkspacePreferences = { widgets: ['stats', 'cases', 'alerts', 'patterns', 'tools'], pinned_project_ids: [] };
export interface WorkspaceNotification { id: string; case_id: string; subject_id: string; search_id?: string; kind: 'mention' | 'review' | 'due_soon' | 'overdue' | 'search_match' | 'case_due' | 'escalation' | 'analytics_gap' | 'analytics_stale' | 'analytics_recovered'; title: string; created_at: string; read: boolean; snoozed_until?: string; due_at?: string; delivery_status?: 'delivered'|'failed'|'skipped'; delivered_at?: string }
export type TimelineKind = 'case'|'evidence'|'comment'|'report'|'task'|'file'|'entity'|'event';
export interface CaseTimelineItem { id: string; kind: TimelineKind; subject_id: string; title: string; source: string; actor_id: string; at: string }
export interface CaseTimeline { items: CaseTimelineItem[]; total: number; page: number; limit: number }
export interface NotificationPreferences { email_enabled: boolean; telegram_enabled: boolean; telegram_chat_id: string }
export interface GraphView { id: string; case_id: string; name: string; notes: string; positions: Record<string, {x:number;y:number}>; filters: {entity_types:string[];valid_from:string;valid_to:string}; settings?:import('../components/graph/graphModel').GraphSettings; created_by: string; created_at: string }
export interface AIClaim { text: string; kind: 'observation' | 'inference'; citation_ids: string[] }
export interface CaseAnalysis { reply: string; source: string; grounding: string; claims: AIClaim[]; citations: {id:string;excerpt:string;snapshot_sha256:string;classification:string;attachment_id?:string;filename?:string;page?:number}[] }
export interface PredictedLink {
  source_id: string;
  source_label: string;
  source_type: string;
  target_id: string;
  target_label: string;
  target_type: string;
  common_neighbors: string[];
  adamic_adar_score: number;
  jaccard_score: number;
  confidence: number;
  suggested_relation: string;
}

export interface KShortestPath {
  rank: number;
  hop_count: number;
  node_ids: string[];
  node_labels: string[];
  edge_types: string[];
}

export interface PatternAnomaly {
  sighting_id: string;
  timestamp: string;
  anomaly_type: 'off_hours_activity' | 'geofence_deviation' | 'high_velocity_jump';
  severity: 'high' | 'medium' | 'low';
  description: string;
  distance_from_center_meters: number;
  latitude: number;
  longitude: number;
}

export interface PatternOfLifeProfile {
  entity_id: string;
  entity_label: string;
  entity_type: string;
  total_sightings: number;
  primary_zone: string;
  primary_latitude: number;
  primary_longitude: number;
  active_hours: number[];
  routine_score: number;
  anomalies: PatternAnomaly[];
}

export interface PatternOfLifeResult {
  case_id: string;
  profiles: PatternOfLifeProfile[];
  total_anomalies: number;
  analyzed_at: string;
}

export interface GraphAnalyticsResult {
  case_id: string;
  total_nodes: number;
  total_edges: number;
  density: number;
  top_influencers: { entity_id: string; label: string; type: string; degree: number; in_degree: number; out_degree: number; page_rank: number; betweenness: number }[];
  communities: { id: number; node_count: number; node_ids: string[] }[];
  predicted_links?: PredictedLink[];
  calculated_at: string;
}

export interface CoTravelPair {
  entity1_id: string;
  entity1_label: string;
  entity1_type: string;
  entity2_id: string;
  entity2_label: string;
  entity2_type: string;
  encounter_count: number;
  earliest_encounter: string;
  latest_encounter: string;
  average_distance_meters: number;
  encounters: { timestamp_1: string; timestamp_2: string; time_diff_seconds: number; distance_meters: number; latitude: number; longitude: number; location_name?: string }[];
}

export interface CoTravelResult {
  case_id: string;
  max_distance_meters: number;
  max_time_window_minutes: number;
  total_pairs: number;
  pairs: CoTravelPair[];
  analyzed_at: string;
}

export interface ACHHypothesis {
  id: string;
  title: string;
  description: string;
  inconsistency_count: number;
  weighted_inconsistency: number;
  likelihood_rank: number;
}

export interface ACHEvidence {
  id: string;
  label: string;
  source_ref?: string;
  credibility: number;
  relevance: number;
  diagnosticity: number;
}

export interface ACHMatrix {
  case_id: string;
  hypotheses: ACHHypothesis[];
  evidence: ACHEvidence[];
  ratings: Record<string, number>;
  notes?: Record<string, string>;
  updated_by?: string;
  updated_at?: string;
}

export interface ACHAnalysisResult {
  case_id: string;
  hypotheses: ACHHypothesis[];
  evidence: ACHEvidence[];
  most_likely_hypothesis_id: string;
  most_likely_title: string;
  total_inconsistencies: number;
  calculated_at: string;
}

export interface AgentProposal {
  id: string;
  case_id: string;
  agent: string;
  action_type: string;
  target_id: string;
  target_label: string;
  reasoning: string;
  confidence: number;
  evidence_citations: string[];
  status: 'pending' | 'approved' | 'rejected';
  decision_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface AgentRunResult {
  case_id: string;
  agent: string;
  summary: string;
  key_findings: string[];
  proposals: AgentProposal[];
  executed_at: string;
}

export interface ResolutionCandidate {
  target_entity_id: string;
  candidate_id: string;
  candidate_label: string;
  candidate_type: string;
  confidence: number;
  score: number;
  recommendation: 'auto_merge' | 'manual_review' | 'unlikely';
  factors: { feature: string; weight: number; matched_value?: string; status: string }[];
}

async function get<T>(url: string): Promise<T> { return unwrap((await client.get<Envelope<T>>(url)).data); }
async function post<T>(url: string, body: unknown): Promise<T> { return unwrap((await client.post<Envelope<T>>(url, body)).data); }
const base = (id: string) => `/cases/${encodeURIComponent(id)}`;
export const workspaceApi = {
  crossCase:(id:string)=>get<{items:{case_id:string;case_title:string;from_id:string;from_name:string;to_id:string;to_name:string;reasons:{field:string;value:string}[]}[];checked_cases:number;truncated:boolean}>(`${base(id)}/cross-case-links`),
  presence:(id:string)=>get<CasePresence[]>(`${base(id)}/presence`),
  touchPresence:async(id:string,area:string,session?:string)=>unwrap((await client.put<Envelope<CasePresence>>(`/workspace/presence/${encodeURIComponent(id)}`,{area,session_id:session})).data),
  leavePresence:async(id:string,session?:string)=>{await client.delete(`/workspace/presence/${encodeURIComponent(id)}`,{params:{session_id:session}});},
  deadline:(id:string)=>get<DeadlinePolicy>(`${base(id)}/deadline`),
  saveDeadline:async(id:string,body:DeadlinePolicy)=>unwrap((await client.put<Envelope<DeadlinePolicy>>(`${base(id)}/deadline`,body)).data),
  reportDraft:(id:string,locale:string)=>get<GeneratedReportDraft>(`${base(id)}/report-draft?locale=${encodeURIComponent(locale)}`),
  suggestions:(id:string)=>get<{items:LinkSuggestion[];truncated:boolean}>(`${base(id)}/link-suggestions`),
  acceptLink:(id:string,body:{from_id:string;to_id:string;type:string;reason:string})=>post<unknown>(`${base(id)}/link-suggestions/accept`,body),
  archive:async(id:string):Promise<Blob>=>(await client.get(`${base(id)}/archive`,{responseType:'blob',timeout:120000})).data,
  diagnostics: (id: string) => get<CaseDiagnostics>(`${base(id)}/diagnostics`),
  reviewConflict: (id: string, conflictId: string, body: { fingerprint: string; status: string; reason: string }) => post<unknown>(`${base(id)}/conflicts/${encodeURIComponent(conflictId)}/review`, body),
	access: (id: string) => get<CaseAccess>(`${base(id)}/access`),
	verifyEvidence: (id: string, evidenceId: string) => get<EvidenceVerification>(`${base(id)}/evidence/${encodeURIComponent(evidenceId)}/verify`),
	async timeline(id: string, kind = 'all', page = 1): Promise<CaseTimeline> { return unwrap((await client.get<Envelope<CaseTimeline>>(`${base(id)}/timeline`, { params: { kind, page, limit: 30 } })).data); },
  context: (id: string) => get<CaseWorkspace>(`${base(id)}/workspace`),
  evidence: (id: string) => get<Evidence[]>(`${base(id)}/evidence`),
  addEvidence: (id: string, body: EvidenceInput) => post<Evidence>(`${base(id)}/evidence`, body),
  comments: (id: string) => get<CaseComment[]>(`${base(id)}/comments`),
  addComment: (id: string, body: { body: string; mention_ids: string[] }) => post<CaseComment>(`${base(id)}/comments`, body),
  reports: (id: string) => get<ReportVersion[]>(`${base(id)}/report-versions`),
  addReport: (id: string, body: { summary: string; evidence_ids: string[] }) => post<ReportVersion>(`${base(id)}/report-versions`, body),
  reviewReport: (id: string, rid: string, decision: 'approved' | 'changes_requested', comment: string) => post<ReportVersion>(`${base(id)}/report-versions/${encodeURIComponent(rid)}/review`, { decision, comment }),
  async reportPDF(id: string, rid: string, redact: string[] = []): Promise<Blob> { return (await client.get(`${base(id)}/report-versions/${encodeURIComponent(rid)}/pdf`, { responseType: 'blob', params: redact.length ? { redact: redact.join(',') } : undefined })).data; },
  graphViews: (id: string) => get<GraphView[]>(`${base(id)}/graph-views`),
  addGraphView: (id: string, body: Omit<GraphView, 'id'|'case_id'|'created_by'|'created_at'>) => post<GraphView>(`${base(id)}/graph-views`, body),
  async deleteGraphView(id: string, viewId: string): Promise<void> { await client.delete(`${base(id)}/graph-views/${encodeURIComponent(viewId)}`); },
  analyze: (id: string, question: string) => post<CaseAnalysis>(`${base(id)}/analyze`, { question }),
  preferences: () => get<WorkspacePreferences>('/workspace/preferences'),
  async savePreferences(body: WorkspacePreferences): Promise<WorkspacePreferences> { return unwrap((await client.put<Envelope<WorkspacePreferences>>('/workspace/preferences', body)).data); },
  notifications: () => get<WorkspaceNotification[]>('/workspace/notifications'),
  async updateNotification(id: string, body: { read?: boolean; snooze_hours?: number }): Promise<WorkspaceNotification> { return unwrap((await client.patch<Envelope<WorkspaceNotification>>(`/workspace/notifications/${encodeURIComponent(id)}`, body)).data); },
  notificationPreferences: () => get<NotificationPreferences>('/workspace/notification-preferences'),
  async saveNotificationPreferences(body: NotificationPreferences): Promise<NotificationPreferences> { return unwrap((await client.put<Envelope<NotificationPreferences>>('/workspace/notification-preferences', body)).data); },

  // Enterprise Intelligence Extensions
  graphAnalytics: (id: string) => get<GraphAnalyticsResult>(`${base(id)}/graph/analytics`),
  kShortestPaths: (id: string, fromId: string, toId: string, k = 3) =>
    get<KShortestPath[]>(`${base(id)}/graph/k-paths?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}&k=${k}`),
  coTravel: (id: string, params?: { max_distance_meters?: number; max_time_minutes?: number }) =>
    get<CoTravelResult>(`${base(id)}/co-travel${params ? `?max_distance_meters=${params.max_distance_meters || 100}&max_time_minutes=${params.max_time_minutes || 15}` : ''}`),
  patternOfLife: (id: string) => get<PatternOfLifeResult>(`${base(id)}/pattern-of-life`),
  ach: (id: string) => get<{ matrix: ACHMatrix; analysis: ACHAnalysisResult }>(`${base(id)}/ach`),
  exportACHCsv: async (id: string): Promise<Blob> => {
    const res = await client.get(`/cases/${encodeURIComponent(id)}/ach/export.csv`, { responseType: 'blob' });
    return res.data;
  },
  saveACH: async (id: string, body: ACHMatrix): Promise<ACHAnalysisResult> =>
    unwrap((await client.put<Envelope<ACHAnalysisResult>>(`${base(id)}/ach`, body)).data),
  runSpecialistAgent: (caseId: string, agentType: string) =>
    post<AgentRunResult>(`/cases/${encodeURIComponent(caseId)}/ai/agents/run`, { agent_type: agentType }),
  listProposals: (caseId: string, status?: string) =>
    get<AgentProposal[]>(`/cases/${encodeURIComponent(caseId)}/ai/proposals${status ? '?status=' + encodeURIComponent(status) : ''}`),
  reviewProposal: (proposalId: string, decision: 'approved' | 'rejected', notes?: string) =>
    post<AgentProposal>(`/ai/proposals/${encodeURIComponent(proposalId)}/decision`, { decision, notes }),
  resolutionCandidates: (entityId: string, minConfidence = 0.65) =>
    get<ResolutionCandidate[]>(`/entities/${encodeURIComponent(entityId)}/resolution-candidates?min_confidence=${minConfidence}`),

  // 7 New Advanced Intelligence & Forensics Modules
  traceCrypto: (address: string, network = 'ETH', maxHops = 3) =>
    get<any>(`/forensics/crypto/trace?address=${encodeURIComponent(address)}&network=${encodeURIComponent(network)}&max_hops=${maxHops}`),
  scanVoiceKeywords: (text: string) =>
    post<{ hits: any[]; count: number }>(`/forensics/voice/keyword-scan`, { text }),
  matchVoiceprint: (sample1: number[], sample2: number[]) =>
    post<{ similarity: number; is_match: boolean }>(`/forensics/voice/match-voiceprint`, { sample1, sample2 }),
  geoFenceDump: (q: { latitude: number; longitude: number; radius_meters: number; from_time?: string; to_time?: string; operator?: string }) =>
    post<{ data: any[]; count: number }>(`/telecom/bts/geofence-dump`, q),
  simSwaps: (msisdn?: string, imei?: string) =>
    get<{ anomalies: any[] }>(`/telecom/anomalies/sim-swaps?msisdn=${encodeURIComponent(msisdn || '')}&imei=${encodeURIComponent(imei || '')}`),
  topContacts: (msisdn: string, limit = 10) =>
    get<{ contacts: any[] }>(`/telecom/contacts/top?msisdn=${encodeURIComponent(msisdn)}&limit=${limit}`),
  getWarRoomBoard: (caseId: string) =>
    get<any>(`/cases/${encodeURIComponent(caseId)}/warroom/board`),
  saveWarRoomBoard: (caseId: string, board: any) =>
    client.put(`/api/v1/cases/${encodeURIComponent(caseId)}/warroom/board`, board).then(r => r.data),
  getWarRoomPresence: (caseId: string) =>
    get<{ active_users: any[] }>(`/cases/${encodeURIComponent(caseId)}/warroom/presence`),
  updateWarRoomPresence: (caseId: string, p: any) =>
    post<any>(`/cases/${encodeURIComponent(caseId)}/warroom/presence`, p),
  liveFlights: (minLat = 37.0, maxLat = 46.0, minLon = 56.0, maxLon = 74.0) =>
    get<{ data: any[]; count: number }>(`/telemetry/flights/live?min_lat=${minLat}&max_lat=${maxLat}&min_lon=${minLon}&max_lon=${maxLon}`),
  osintProfile: (query: string) =>
    post<any>(`/osint/profile`, { query }),
  fieldFastCheck: (req: { officer_id: string; terminal_id: string; latitude: number; longitude: number; pinfl?: string; passport_num?: string; vehicle_plate?: string }) =>
    post<any>(`/field/fast-check`, req),
  fieldSyncBundle: () =>
    get<{ bundle: any }>(`/field/sync-bundle`),
  seedCryptoDemo: () =>
    post<any>(`/forensics/crypto/seed-demo`, {}),
  seedTelecomDemo: () =>
    post<any>(`/telecom/seed-demo`, {}),
  seedFlightsDemo: () =>
    post<any>(`/telemetry/flights/seed-demo`, {}),
};

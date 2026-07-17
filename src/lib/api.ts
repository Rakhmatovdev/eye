import apiClient, { unwrap, type Envelope } from './apiClient';
import type { Entity, EntityType, ClassificationLevel } from '../data/mockEntities';
import type { Relationship } from '../data/mockRelationships';
import type { TimelineEvent } from '../data/mockEvents';
import type { Case } from '../data/mockCases';
import type { AuthUser } from '../store/authStore';

/* ----------------------------- Backend shapes ---------------------------- */

interface BackendUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  clearance_level: number;
  status: string;
  mfa_enabled?: boolean;
}

// LoginData covers both outcomes of POST /auth/login: a normal success (tokens
// + user) and the MFA challenge (`mfa_required: true`, no tokens/user yet).
interface LoginData {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: BackendUser;
  mfa_required?: boolean;
}

interface BackendEntity {
  id: string;
  type: string;
  properties: Record<string, unknown> | null;
  classification: string;
  source_id: string;
  created_at: string;
  updated_at: string;
}

interface BackendRelationship {
  id: string;
  entity_id_from: string;
  entity_id_to: string;
  type: string;
  properties: Record<string, unknown> | null;
  created_at: string;
}

interface GraphData {
  nodes: BackendEntity[] | null;
  edges: BackendRelationship[] | null;
}

interface BackendEvent {
  id: string;
  timestamp: string;
  entity_id: string;
  title: string;
  description: string;
  type: string;
  location: string;
}

/* ------------------------------- Mappers --------------------------------- */

// clearance_level (1-5) → human label used by the UI.
const CLEARANCE_LABELS: Record<number, string> = {
  1: 'PUBLIC',
  2: 'INTERNAL',
  3: 'SECRET',
  4: 'TOP_SECRET',
  5: 'COSMIC',
};

export function mapUser(u: BackendUser): AuthUser {
  return {
    id: u.id,
    name: `${u.first_name} ${u.last_name}`.trim() || u.email,
    email: u.email,
    role: u.role,
    clearance: CLEARANCE_LABELS[u.clearance_level] || `LVL-${u.clearance_level}`,
    mfaEnabled: !!u.mfa_enabled,
  };
}

function asString(v: unknown): string | undefined {
  return v == null ? undefined : String(v);
}

// Backend stores everything free-form in `properties`; the UI expects a richer
// flat shape. Pull name/tags/geo out of properties, keep the rest as-is.
export function mapEntity(e: BackendEntity): Entity {
  const props = (e.properties || {}) as Record<string, unknown>;

  const name =
    asString(props.name) ||
    asString(props.label) ||
    asString(props.title) ||
    e.id;

  let tags: string[] = [];
  if (Array.isArray(props.tags)) {
    tags = props.tags.map((t) => String(t));
  } else if (typeof props.tags === 'string') {
    tags = props.tags.split(',').map((t) => t.trim()).filter(Boolean);
  }

  const lat = props.lat ?? props.latitude;
  const lng = props.lng ?? props.longitude;
  const geo =
    lat != null && lng != null
      ? { lat: Number(lat), lng: Number(lng), address: asString(props.address) }
      : undefined;

  // Keep only primitive props for the flat `properties` map the UI renders,
  // excluding keys already surfaced as dedicated fields (name/geo/tags/risk) so
  // the attributes list doesn't redundantly repeat them.
  const EXTRACTED = new Set([
    'name', 'label', 'title', 'tags', 'lat', 'lng', 'latitude', 'longitude', 'address', 'risk_score',
  ]);
  const flatProps: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (typeof v === 'object') continue;
    if (EXTRACTED.has(k)) continue;
    flatProps[k] = v as string | number | boolean;
  }

  return {
    id: e.id,
    type: (e.type as EntityType) || 'document',
    name,
    classification: (e.classification as ClassificationLevel) || 'internal',
    risk_score: props.risk_score != null ? Number(props.risk_score) : undefined,
    created_at: e.created_at,
    updated_at: e.updated_at,
    tags,
    source: e.source_id || 'unknown',
    properties: flatProps,
    geo,
    case_ids: [],
  };
}

export function mapEvent(e: BackendEvent): TimelineEvent {
  return {
    id: e.id,
    timestamp: e.timestamp,
    entity_id: e.entity_id,
    title: e.title,
    description: e.description,
    type: e.type,
    location: e.location || undefined,
  };
}

export function mapRelationship(r: BackendRelationship): Relationship {
  const props = (r.properties || {}) as Record<string, unknown>;
  return {
    id: r.id,
    source: r.entity_id_from,
    target: r.entity_id_to,
    type: r.type,
    label: asString(props.label) || r.type,
  };
}

/* --------------------------------- API ----------------------------------- */

// LoginResult is either the MFA challenge (no tokens yet — caller must resubmit
// with `otp`) or a completed login (user + token).
export type LoginResult =
  | { mfaRequired: true }
  | { mfaRequired: false; user: AuthUser; token: string; refreshToken?: string };

export const authApi = {
  async login(email: string, password: string, otp?: string): Promise<LoginResult> {
    const res = await apiClient.post<Envelope<LoginData>>('/auth/login', {
      email,
      password,
      otp: otp || undefined,
    });
    const data = unwrap(res.data);
    if (data.mfa_required) {
      return { mfaRequired: true };
    }
    return {
      mfaRequired: false,
      user: mapUser(data.user as BackendUser),
      token: data.access_token as string,
      refreshToken: data.refresh_token,
    };
  },
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      /* best-effort; token is dropped client-side regardless */
    }
  },
  async me(): Promise<AuthUser> {
    const res = await apiClient.get<Envelope<BackendUser>>('/auth/me');
    return mapUser(unwrap(res.data));
  },
  // Backend revokes all refresh tokens on success — callers must force a
  // fresh login afterwards (the current session's access token still works
  // until it expires, but silent refresh will no longer succeed).
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};

/* --------------------------------- MFA ------------------------------------ */

export interface MFAEnrollment {
  secret: string;
  otpauthUrl: string;
}

export const mfaApi = {
  async enroll(): Promise<MFAEnrollment> {
    const res = await apiClient.post<Envelope<{ secret: string; otpauth_url: string }>>('/auth/mfa/enroll');
    const data = unwrap(res.data);
    return { secret: data.secret, otpauthUrl: data.otpauth_url };
  },
  async verify(otp: string): Promise<void> {
    await apiClient.post('/auth/mfa/verify', { otp });
  },
  async disable(otp: string): Promise<void> {
    await apiClient.post('/auth/mfa/disable', { otp });
  },
};

export const entitiesApi = {
  async list(params: { search?: string; type?: string } = {}): Promise<Entity[]> {
    const res = await apiClient.get<Envelope<BackendEntity[] | null>>('/entities', {
      params: {
        search: params.search || undefined,
        type: params.type && params.type !== 'all' ? params.type : undefined,
      },
    });
    return (unwrap(res.data) || []).map(mapEntity);
  },

  async get(id: string): Promise<Entity> {
    const res = await apiClient.get<Envelope<BackendEntity>>(`/entities/${id}`);
    return mapEntity(unwrap(res.data));
  },

  async expand(nodeId: string): Promise<{ nodes: Entity[]; edges: Relationship[] }> {
    const res = await apiClient.post<Envelope<GraphData>>('/graph/expand', { node_id: nodeId });
    const data = unwrap(res.data);
    return {
      nodes: (data.nodes || []).map(mapEntity),
      edges: (data.edges || []).map(mapRelationship),
    };
  },

  async path(startId: string, endId: string): Promise<{ nodes: Entity[]; edges: Relationship[] }> {
    const res = await apiClient.post<Envelope<GraphData>>('/graph/path', {
      start_id: startId,
      end_id: endId,
    });
    const data = unwrap(res.data);
    return {
      nodes: (data.nodes || []).map(mapEntity),
      edges: (data.edges || []).map(mapRelationship),
    };
  },

  // Full replace of type/classification/properties. Callers should seed the
  // properties payload from the entity's current (mapped) shape so fields the
  // UI doesn't expose for editing (geo, tags, risk_score, ...) round-trip
  // instead of being dropped.
  async update(
    id: string,
    input: { type?: string; classification?: string; properties?: Record<string, unknown> }
  ): Promise<Entity> {
    const res = await apiClient.put<Envelope<BackendEntity>>(`/entities/${id}`, input);
    return mapEntity(unwrap(res.data));
  },

  // Deletes the entity and its relationships (backend cascades).
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/entities/${id}`);
  },
};

export const relationshipsApi = {
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/entities/relationship/${id}`);
  },
};

/* ------------------------------- Sensors --------------------------------- */

export interface Sensor {
  id: string;
  name: string;
  type: string;
  status: string;
  lat: number;
  lng: number;
  area: string;
  coverage_radius: number;
  resolution: string;
  classification: string;
  feed_url: string;
  last_heartbeat: string;
}

export interface Detection {
  id: string;
  sensor_id: string;
  sensor_name: string;
  entity_id: string;
  entity_name: string;
  kind: string;
  confidence: number;
  lat: number;
  lng: number;
  area: string;
  timestamp: string;
}

export interface SensorStats {
  total: number;
  online: number;
  degraded: number;
  offline: number;
  detections_24h: number;
  identified_hits: number;
}

export const sensorsApi = {
  async list(params: { type?: string; status?: string } = {}): Promise<Sensor[]> {
    const res = await apiClient.get<Envelope<Sensor[] | null>>('/sensors', {
      params: {
        type: params.type && params.type !== 'all' ? params.type : undefined,
        status: params.status && params.status !== 'all' ? params.status : undefined,
      },
    });
    return unwrap(res.data) || [];
  },
  async detections(params: { sensorId?: string; entityId?: string; limit?: number } = {}): Promise<Detection[]> {
    const res = await apiClient.get<Envelope<Detection[] | null>>('/sensors/detections', {
      params: { sensor_id: params.sensorId, entity_id: params.entityId, limit: params.limit },
    });
    return unwrap(res.data) || [];
  },
  async stats(): Promise<SensorStats> {
    const res = await apiClient.get<Envelope<SensorStats>>('/sensors/stats');
    return unwrap(res.data);
  },
};

/* ------------------------------- Military -------------------------------- */

export interface Unit {
  id: string; callsign: string; name: string; type: string; domain: string;
  status: string; readiness: string; lat: number; lng: number;
  strength: number; heading: number; speed: number; updated_at: string;
}
export interface Threat {
  id: string; designation: string; type: string; classification: string;
  threat_level: string; lat: number; lng: number; heading: number; speed: number;
  confidence: number; entity_id: string; last_seen: string;
}
export interface Mission {
  id: string; name: string; status: string; priority: string; objective: string;
  area: string; assigned_units: string[]; progress: number; starts_at: string; updated_at: string;
}
export interface MilitaryStats {
  units: number; units_ready: number; threats: number; critical_threats: number; active_missions: number;
}

export const militaryApi = {
  async units(): Promise<Unit[]> {
    const res = await apiClient.get<Envelope<Unit[] | null>>('/military/units');
    return unwrap(res.data) || [];
  },
  async threats(classification?: string): Promise<Threat[]> {
    const res = await apiClient.get<Envelope<Threat[] | null>>('/military/threats', {
      params: { classification: classification && classification !== 'all' ? classification : undefined },
    });
    return unwrap(res.data) || [];
  },
  async missions(): Promise<Mission[]> {
    const res = await apiClient.get<Envelope<Mission[] | null>>('/military/missions');
    return unwrap(res.data) || [];
  },
  async stats(): Promise<MilitaryStats> {
    const res = await apiClient.get<Envelope<MilitaryStats>>('/military/stats');
    return unwrap(res.data);
  },
};

/* -------------------------------- Cases ---------------------------------- */

interface BackendCase {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  classification?: string;
  owner_id?: string;
  created_at: string;
}

export function mapCase(c: BackendCase): Case {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    status: (c.status as Case['status']) || 'open',
    priority: (c.priority as Case['priority']) || 'medium',
    assignee: c.owner_id ? c.owner_id.slice(0, 8) : 'unassigned',
    entityCount: 0,
    created_at: c.created_at,
  };
}

export const casesApi = {
  async list(): Promise<Case[]> {
    const res = await apiClient.get<Envelope<BackendCase[] | null>>('/cases');
    return (unwrap(res.data) || []).map(mapCase);
  },
  async get(id: string): Promise<Case> {
    const res = await apiClient.get<Envelope<BackendCase>>(`/cases/${id}`);
    return mapCase(unwrap(res.data));
  },
  async update(id: string, patch: { title?: string; description?: string; status?: string }): Promise<Case> {
    const res = await apiClient.patch<Envelope<BackendCase>>(`/cases/${id}`, patch);
    return mapCase(unwrap(res.data));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/cases/${id}`);
  },
  async entities(caseId: string): Promise<Entity[]> {
    const res = await apiClient.get<Envelope<BackendEntity[] | null>>(`/cases/${caseId}/entities`);
    return (unwrap(res.data) || []).map(mapEntity);
  },
  async removeEntity(caseId: string, entityId: string): Promise<void> {
    await apiClient.delete(`/cases/${caseId}/entities/${entityId}`);
  },
};

/* ---------------------------------- AI ----------------------------------- */

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatHistoryEntry {
  message: string;
  reply: string;
  source: string;
  ts: string;
}

export const aiApi = {
  async chat(message: string, history: ChatTurn[] = [], context?: string): Promise<{ reply: string; source: string }> {
    const res = await apiClient.post<Envelope<{ reply: string; source: string }>>('/ai/chat', {
      message,
      history,
      context,
    });
    return unwrap(res.data);
  },
  // Oldest-first past exchanges for this user. Callers should tolerate this
  // 404ing (endpoint may not exist yet) and just start with an empty chat.
  async history(limit = 50): Promise<ChatHistoryEntry[]> {
    const res = await apiClient.get<Envelope<ChatHistoryEntry[] | null>>('/ai/history', { params: { limit } });
    return unwrap(res.data) || [];
  },
};

export const timelineApi = {
  async list(params: { type?: string; entityId?: string } = {}): Promise<TimelineEvent[]> {
    const res = await apiClient.get<Envelope<BackendEvent[] | null>>('/timeline', {
      params: {
        type: params.type && params.type !== 'all' ? params.type : undefined,
        entity_id: params.entityId || undefined,
      },
    });
    return (unwrap(res.data) || []).map(mapEvent);
  },
};

// Build a graph from the whole entity set: entities are nodes, and each node's
// neighbourhood is fetched via /graph/expand and merged (deduped). There is no
// "list all relationships" endpoint, so this is the MVP way to assemble edges.
export async function fetchGraph(limit = 40): Promise<{ nodes: Entity[]; edges: Relationship[] }> {
  const entities = await entitiesApi.list();
  const nodes = entities.slice(0, limit);

  const edgeMap = new Map<string, Relationship>();
  const nodeMap = new Map<string, Entity>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const results = await Promise.allSettled(nodes.map((n) => entitiesApi.expand(n.id)));
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    r.value.edges.forEach((e) => edgeMap.set(e.id, e));
    r.value.nodes.forEach((n) => {
      if (!nodeMap.has(n.id)) nodeMap.set(n.id, n);
    });
  }

  return { nodes: Array.from(nodeMap.values()), edges: Array.from(edgeMap.values()) };
}

import apiClient, { unwrap, type Envelope } from './apiClient';
import type { Entity, EntityType, ClassificationLevel } from '../data/mockEntities';
import type { Relationship } from '../data/mockRelationships';
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
}

interface LoginData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: BackendUser;
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

  // Keep only primitive props for the flat `properties` map the UI renders.
  const flatProps: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (typeof v === 'object') continue;
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

export const authApi = {
  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const res = await apiClient.post<Envelope<LoginData>>('/auth/login', { email, password });
    const data = unwrap(res.data);
    return { user: mapUser(data.user), token: data.access_token };
  },
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      /* best-effort; token is dropped client-side regardless */
    }
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

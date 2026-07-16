import type { Unit, Threat, Mission, MilitaryStats } from '../lib/api';

const now = () => new Date().toISOString();
const ago = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const mockUnits: Unit[] = [
  { id: 'u-001', callsign: 'EAGLE-6', name: 'Task Force HQ', type: 'hq', domain: 'land', status: 'active', readiness: 'green', lat: 41.3111, lng: 69.2797, strength: 45, heading: 0, speed: 0, updated_at: now() },
  { id: 'u-002', callsign: 'STEEL-1', name: '1st Armored Coy', type: 'armor', domain: 'land', status: 'moving', readiness: 'green', lat: 40.9, lng: 71.75, strength: 120, heading: 210, speed: 32, updated_at: now() },
  { id: 'u-004', callsign: 'GHOST-9', name: 'SOF Detachment', type: 'infantry', domain: 'land', status: 'engaged', readiness: 'green', lat: 38.6, lng: 68.8, strength: 16, heading: 140, speed: 6, updated_at: now() },
  { id: 'u-005', callsign: 'HAWK-1', name: 'UAV Sqn (Reaper)', type: 'uav', domain: 'air', status: 'active', readiness: 'green', lat: 40.7841, lng: 72.3417, strength: 3, heading: 270, speed: 240, updated_at: now() },
];

export const mockThreats: Threat[] = [
  { id: 't-001', designation: 'HOSTILE-01 (convoy)', type: 'convoy', classification: 'hostile', threat_level: 'critical', lat: 38.97, lng: 70.1839, heading: 300, speed: 45, confidence: 0.88, entity_id: 'ent-009', last_seen: ago(12) },
  { id: 't-002', designation: 'SUSPECT-04 (UAV)', type: 'uav', classification: 'suspect', threat_level: 'high', lat: 40.75, lng: 72.6, heading: 250, speed: 120, confidence: 0.72, entity_id: '', last_seen: ago(5) },
  { id: 't-004', designation: 'UNKNOWN-07 (track)', type: 'unknown', classification: 'unknown', threat_level: 'medium', lat: 42.3, lng: 69.6, heading: 180, speed: 60, confidence: 0.55, entity_id: '', last_seen: ago(3) },
];

export const mockMissions: Mission[] = [
  { id: 'm-001', name: 'OP SILK SENTINEL', status: 'active', priority: 'immediate', objective: 'Interdict HOSTILE-01 narcotics convoy before border crossing.', area: 'Dushanbe–Termez corridor', assigned_units: ['u-004', 'u-005'], progress: 65, starts_at: ago(360), updated_at: now() },
  { id: 'm-002', name: 'OP IRON GATE', status: 'active', priority: 'priority', objective: 'Screen Fergana valley approaches; maintain COP on suspect UAV activity.', area: 'Fergana Valley', assigned_units: ['u-002'], progress: 40, starts_at: ago(600), updated_at: now() },
  { id: 'm-003', name: 'OP NIGHT LEDGER', status: 'planning', priority: 'priority', objective: 'Prepare cordon-and-search of Silk Road Trading premises.', area: 'Tashkent — Yunusabad', assigned_units: ['u-001'], progress: 15, starts_at: ago(120), updated_at: now() },
];

export const mockMilitaryStats: MilitaryStats = {
  units: 8, units_ready: 6, threats: 6, critical_threats: 2, active_missions: 2,
};

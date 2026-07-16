import type { Sensor, Detection, SensorStats } from '../lib/api';

// Demo fallback for the Surveillance page when the API is unreachable.
export const mockSensors: Sensor[] = [
  { id: 'cam-001', name: 'TAS Airport — Terminal Cam A', type: 'camera', status: 'online', lat: 41.2579, lng: 69.2812, area: 'Tashkent Intl Airport', coverage_radius: 300, resolution: '4K', classification: 'confidential', feed_url: 'sim://cam-001', last_heartbeat: new Date().toISOString() },
  { id: 'cam-002', name: 'TAS Airport — Passport Control', type: 'camera', status: 'online', lat: 41.2585, lng: 69.2805, area: 'Tashkent Intl Airport', coverage_radius: 150, resolution: '4K', classification: 'secret', feed_url: 'sim://cam-002', last_heartbeat: new Date().toISOString() },
  { id: 'cam-004', name: 'Yunusabad — Silk Road Office', type: 'camera', status: 'degraded', lat: 41.32, lng: 69.26, area: 'Tashkent — Yunusabad', coverage_radius: 80, resolution: '1080p', classification: 'secret', feed_url: 'sim://cam-004', last_heartbeat: new Date().toISOString() },
  { id: 'drn-001', name: 'UAV Reaper-7 (patrol)', type: 'drone', status: 'online', lat: 40.7841, lng: 72.3417, area: 'Fergana Valley', coverage_radius: 5000, resolution: 'EO/IR gimbal', classification: 'secret', feed_url: 'sim://drn-001', last_heartbeat: new Date().toISOString() },
  { id: 'sig-001', name: 'SIGINT Collector Alpha', type: 'sigint', status: 'online', lat: 41.2995, lng: 69.2401, area: 'Tashkent metro', coverage_radius: 15000, resolution: 'COMINT', classification: 'secret', feed_url: 'sim://sig-001', last_heartbeat: new Date().toISOString() },
  { id: 'cam-007', name: 'Termez Rail — Gate 2', type: 'camera', status: 'offline', lat: 37.2242, lng: 67.2783, area: 'Termez Rail Terminal', coverage_radius: 180, resolution: '1080p', classification: 'confidential', feed_url: 'sim://cam-007', last_heartbeat: new Date().toISOString() },
];

const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const mockDetections: Detection[] = [
  { id: 'det-001', sensor_id: 'cam-002', sensor_name: 'TAS Airport — Passport Control', entity_id: 'ent-001', entity_name: 'Alisher Karimov', kind: 'face_match', confidence: 0.96, lat: 41.2585, lng: 69.2805, area: 'Tashkent Intl Airport', timestamp: ago(2) },
  { id: 'det-003', sensor_id: 'cam-003', sensor_name: 'Dostuk Border — Lane 3 ANPR', entity_id: 'ent-005', entity_name: 'Bekzod Toshmatov', kind: 'plate_match', confidence: 0.99, lat: 40.77, lng: 69.29, area: 'Dostuk Border Crossing', timestamp: ago(8) },
  { id: 'det-007', sensor_id: 'drn-002', sensor_name: 'UAV Shadow-3 (loiter)', entity_id: 'ent-009', entity_name: 'Timur Umarov', kind: 'thermal', confidence: 0.71, lat: 38.5598, lng: 68.7739, area: 'Dushanbe approach', timestamp: ago(26) },
  { id: 'det-011', sensor_id: 'cam-003', sensor_name: 'Dostuk Border — Lane 3 ANPR', entity_id: '', entity_name: 'Unidentified vehicle', kind: 'plate_match', confidence: 0.55, lat: 40.77, lng: 69.29, area: 'Dostuk Border Crossing', timestamp: ago(3) },
];

export const mockSensorStats: SensorStats = {
  total: 12, online: 9, degraded: 2, offline: 1, detections_24h: 10, identified_hits: 14,
};

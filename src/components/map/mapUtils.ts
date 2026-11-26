import type { GeoPoint, LiveMapPoint, MapCoordinate, RadiusAnalysis, SensorPoint } from './types';

const EARTH_RADIUS_METERS = 6_371_000;

function radians(degrees: number): number {
  return degrees * Math.PI / 180;
}

export function haversineDistanceMeters(a: MapCoordinate, b: MapCoordinate): number {
  const latDelta = radians(b.lat - a.lat);
  const lngDelta = radians(b.lng - a.lng);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const h = Math.sin(latDelta / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatMapDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1_000) return `${Math.round(meters)} m`;
  return `${(meters / 1_000).toFixed(meters < 10_000 ? 2 : 1)} km`;
}

export function findLocalMapFeature(
  query: string,
  points: GeoPoint[],
  sensors: SensorPoint[]
): { lat: number; lng: number; label: string; kind: 'entity' | 'sensor' } | null {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return null;

  const entity = points.find((point) =>
    [point.name, point.type, point.address].some((value) => value?.toLocaleLowerCase().includes(normalized))
  );
  if (entity) return { lat: entity.lat, lng: entity.lng, label: entity.name, kind: 'entity' };

  const sensor = sensors.find((point) =>
    [point.name, point.type, point.area].some((value) => value?.toLocaleLowerCase().includes(normalized))
  );
  return sensor
    ? { lat: sensor.lat, lng: sensor.lng, label: sensor.name, kind: 'sensor' }
    : null;
}

export function pointInPolygon(point: MapCoordinate, polygon: MapCoordinate[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crossesLatitude = (currentPoint.lat > point.lat) !== (previousPoint.lat > point.lat);
    const boundaryLng = (previousPoint.lng - currentPoint.lng) * (point.lat - currentPoint.lat)
      / (previousPoint.lat - currentPoint.lat || Number.EPSILON) + currentPoint.lng;
    if (crossesLatitude && point.lng < boundaryLng) inside = !inside;
  }
  return inside;
}

export function polygonAreaSquareMeters(polygon: MapCoordinate[]): number {
  if (polygon.length < 3) return 0;
  const meanLatitude = radians(polygon.reduce((sum, point) => sum + point.lat, 0) / polygon.length);
  const projected = polygon.map((point) => ({
    x: EARTH_RADIUS_METERS * radians(point.lng) * Math.cos(meanLatitude),
    y: EARTH_RADIUS_METERS * radians(point.lat),
  }));
  let twiceArea = 0;
  for (let index = 0; index < projected.length; index += 1) {
    const current = projected[index];
    const next = projected[(index + 1) % projected.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return Math.abs(twiceArea) / 2;
}

export function formatMapArea(squareMeters: number): string {
  if (!Number.isFinite(squareMeters) || squareMeters < 0) return '—';
  if (squareMeters < 1_000_000) return `${Math.round(squareMeters).toLocaleString()} m²`;
  return `${(squareMeters / 1_000_000).toFixed(squareMeters < 10_000_000 ? 2 : 1)} km²`;
}

export function buildMapGeoJSON(input: {
  points: GeoPoint[];
  sensors: SensorPoint[];
  livePoints: LiveMapPoint[];
  geofencePoints?: MapCoordinate[];
  radiusAnalysis?: RadiusAnalysis | null;
}) {
  const features: Array<Record<string, unknown>> = [];
  input.points.forEach((point) => features.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
    properties: {
      layer: 'entity', id: point.id, name: point.name, entity_type: point.type,
      classification: point.classification, address: point.address ?? null, risk_score: point.risk_score ?? null,
    },
  }));
  input.sensors.forEach((sensor) => features.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [sensor.lng, sensor.lat] },
    properties: {
      layer: 'sensor', id: sensor.id, name: sensor.name, sensor_type: sensor.type,
      status: sensor.status, area: sensor.area, coverage_radius_m: sensor.coverage_radius,
    },
  }));
  input.livePoints.forEach((point) => features.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
    properties: {
      layer: 'live_detection', id: point.id, name: point.name, detection_type: point.kind,
      confidence: point.confidence, area: point.area, timestamp: point.timestamp,
    },
  }));
  if ((input.geofencePoints?.length ?? 0) >= 3) {
    const ring = input.geofencePoints!.map((point) => [point.lng, point.lat]);
    ring.push([...ring[0]]);
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { layer: 'analysis_geofence' },
    });
  }
  if (input.radiusAnalysis) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [input.radiusAnalysis.center.lng, input.radiusAnalysis.center.lat],
      },
      properties: { layer: 'analysis_radius', radius_m: input.radiusAnalysis.radiusMeters },
    });
  }
  return { type: 'FeatureCollection', features } as const;
}

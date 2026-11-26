import {
  buildMapGeoJSON,
  findLocalMapFeature,
  formatMapArea,
  formatMapDistance,
  haversineDistanceMeters,
  pointInPolygon,
  polygonAreaSquareMeters,
} from '../mapUtils';
import type { GeoPoint, SensorPoint } from '../types';

const entities: GeoPoint[] = [
  {
    id: 'ent-1', name: 'Amir Temur maydoni', type: 'location', classification: 'public',
    lat: 41.3111, lng: 69.2797, address: 'Toshkent',
  },
];
const sensors: SensorPoint[] = [
  {
    id: 'sen-1', name: 'Chilonzor kamera', type: 'cctv', status: 'online',
    lat: 41.275, lng: 69.203, area: 'Chilonzor', coverage_radius: 500,
  },
];

describe('map utilities', () => {
  it('calculates geodesic distance between map coordinates', () => {
    const distance = haversineDistanceMeters(
      { lat: 41.3111, lng: 69.2797 },
      { lat: 39.6542, lng: 66.9597 }
    );
    expect(distance).toBeGreaterThan(260_000);
    expect(distance).toBeLessThan(280_000);
  });

  it('formats meter and kilometre distances', () => {
    expect(formatMapDistance(480)).toBe('480 m');
    expect(formatMapDistance(1_540)).toBe('1.54 km');
    expect(formatMapDistance(23_100)).toBe('23.1 km');
  });

  it('searches local entity addresses and sensor areas case-insensitively', () => {
    expect(findLocalMapFeature('TOSHKENT', entities, sensors)?.label).toBe('Amir Temur maydoni');
    expect(findLocalMapFeature('chilonzor', entities, sensors)?.kind).toBe('sensor');
    expect(findLocalMapFeature('missing', entities, sensors)).toBeNull();
  });

  it('detects points in a geofence and calculates its area', () => {
    const polygon = [
      { lat: 41.30, lng: 69.20 },
      { lat: 41.30, lng: 69.21 },
      { lat: 41.31, lng: 69.21 },
      { lat: 41.31, lng: 69.20 },
    ];
    expect(pointInPolygon({ lat: 41.305, lng: 69.205 }, polygon)).toBe(true);
    expect(pointInPolygon({ lat: 41.32, lng: 69.205 }, polygon)).toBe(false);
    const area = polygonAreaSquareMeters(polygon);
    expect(area).toBeGreaterThan(900_000);
    expect(area).toBeLessThan(1_100_000);
    expect(formatMapArea(area)).toMatch(/m²|km²/);
  });

  it('exports visible operational layers as valid GeoJSON features', () => {
    const geojson = buildMapGeoJSON({
      points: entities,
      sensors,
      livePoints: [],
      geofencePoints: [
        { lat: 41.3, lng: 69.2 },
        { lat: 41.3, lng: 69.3 },
        { lat: 41.4, lng: 69.3 },
      ],
      radiusAnalysis: { center: { lat: 41.3, lng: 69.2 }, radiusMeters: 1_000 },
    });
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(4);
    expect((geojson.features[2].geometry as { type: string }).type).toBe('Polygon');
  });
});

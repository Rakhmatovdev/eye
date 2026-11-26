export interface GeoPoint {
  id: string;
  name: string;
  type: string;
  classification: string;
  lat: number;
  lng: number;
  address?: string;
  risk_score?: number;
}

export interface SensorPoint {
  id: string;
  name: string;
  type: string;
  status: string;
  lat: number;
  lng: number;
  area: string;
  coverage_radius: number;
}

export interface LiveMapPoint {
  id: string;
  name: string;
  kind: string;
  confidence: number;
  lat: number;
  lng: number;
  area: string;
  timestamp: string;
}

export interface MapCoordinate {
  lat: number;
  lng: number;
}

export interface MapFocus extends MapCoordinate {
  zoom?: number;
}

export interface RadiusAnalysis {
  center: MapCoordinate;
  radiusMeters: number;
}

export type Basemap = 'street' | 'dark' | 'topographic';

export interface MapCanvasProps {
  points: GeoPoint[];
  sensors?: SensorPoint[];
  livePoints?: LiveMapPoint[];
  basemap?: Basemap;
  focus?: MapFocus | null;
  userLocation?: MapCoordinate | null;
  measureMode?: boolean;
  measurePoints?: MapCoordinate[];
  geofencePoints?: MapCoordinate[];
  radiusAnalysis?: RadiusAnalysis | null;
  onMapClick?: (coordinate: MapCoordinate) => void;
}

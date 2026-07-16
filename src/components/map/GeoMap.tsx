'use client';
import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

const SENSOR_STATUS_COLOR: Record<string, string> = {
  online: '#34d399',
  degraded: '#f59e0b',
  offline: '#ef4444',
};

// Marker fill per entity type (hex, since Leaflet paths take raw colors).
const TYPE_COLOR: Record<string, string> = {
  person: '#22d3ee',
  organization: '#a78bfa',
  location: '#34d399',
  vehicle: '#f59e0b',
  phone: '#60a5fa',
  document: '#94a3b8',
  transaction: '#f43f5e',
};

export default function GeoMap({ points, sensors = [] }: { points: GeoPoint[]; sensors?: SensorPoint[] }) {
  // Center on the centroid of the points, or Central Asia as a default.
  const center: [number, number] = points.length
    ? [
        points.reduce((s, p) => s + p.lat, 0) / points.length,
        points.reduce((s, p) => s + p.lng, 0) / points.length,
      ]
    : [41.3, 69.24];

  return (
    <MapContainer
      center={center}
      zoom={5}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', background: '#07090F' }}
    >
      {/* CartoDB dark basemap — free, no API token required. */}
      <TileLayer
        attribution='&copy; OpenStreetMap &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {points.map((p) => {
        const color = TYPE_COLOR[p.type] || '#22d3ee';
        // Scale radius mildly with risk so hotspots stand out.
        const radius = 7 + Math.min(8, (p.risk_score ?? 0) / 12);
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={radius}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: 1.5 }}
          >
            <Popup>
              <div style={{ fontFamily: 'monospace', minWidth: 160 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color, marginBottom: 4 }}>
                  {p.type} · {p.classification}
                </div>
                {p.address && <div style={{ fontSize: 11, color: '#555' }}>{p.address}</div>}
                {p.risk_score != null && (
                  <div style={{ fontSize: 11, color: '#b45309' }}>risk: {p.risk_score}</div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Sensor coverage + markers layer */}
      {sensors.map((s) => {
        const color = SENSOR_STATUS_COLOR[s.status] || '#34d399';
        return (
          <React.Fragment key={s.id}>
            <Circle
              center={[s.lat, s.lng]}
              radius={s.coverage_radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.06, weight: 1, dashArray: '4 4' }}
            />
            <CircleMarker
              center={[s.lat, s.lng]}
              radius={5}
              pathOptions={{ color, fillColor: '#0b0f17', fillOpacity: 1, weight: 2 }}
            >
              <Popup>
                <div style={{ fontFamily: 'monospace', minWidth: 150 }}>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color }}>
                    {s.type} · {s.status}
                  </div>
                  <div style={{ fontSize: 11, color: '#555' }}>{s.area}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>coverage {(s.coverage_radius / 1000).toFixed(1)} km</div>
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}

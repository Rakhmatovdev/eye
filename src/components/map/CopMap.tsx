'use client';
import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Unit, Threat } from '../../lib/api';

const THREAT_COLOR: Record<string, string> = {
  hostile: '#ef4444',
  suspect: '#f59e0b',
  unknown: '#eab308',
};

// A short vector in the heading direction, so moving tracks show their bearing.
function headingLine(lat: number, lng: number, heading: number): [number, number][] {
  const d = 0.18;
  const rad = (heading * Math.PI) / 180;
  const dLat = d * Math.cos(rad);
  const dLng = (d * Math.sin(rad)) / Math.cos((lat * Math.PI) / 180);
  return [[lat, lng], [lat + dLat, lng + dLng]];
}

export default function CopMap({ units, threats }: { units: Unit[]; threats: Threat[] }) {
  const all = [...units, ...threats];
  const center: [number, number] = all.length
    ? [all.reduce((s, p) => s + p.lat, 0) / all.length, all.reduce((s, p) => s + p.lng, 0) / all.length]
    : [40.5, 70];

  return (
    <MapContainer center={center} zoom={6} scrollWheelZoom style={{ height: '100%', width: '100%', background: '#07090F' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap &copy; CARTO"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Friendly units — cyan */}
      {units.map((u) => (
        <React.Fragment key={u.id}>
          {u.speed > 0 && (
            <Polyline positions={headingLine(u.lat, u.lng, u.heading)} pathOptions={{ color: '#22d3ee', weight: 1.5, opacity: 0.6 }} />
          )}
          <CircleMarker
            center={[u.lat, u.lng]}
            radius={u.type === 'hq' ? 9 : 7}
            pathOptions={{ color: '#22d3ee', fillColor: '#0e7490', fillOpacity: 0.85, weight: 2 }}
          >
            <Popup>
              <div style={{ fontFamily: 'monospace', minWidth: 170 }}>
                <div style={{ fontWeight: 700, color: '#0e7490' }}>{u.callsign}</div>
                <div style={{ fontSize: 11 }}>{u.name}</div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#0891b2' }}>{u.type} · {u.status}</div>
                <div style={{ fontSize: 11, color: '#555' }}>readiness: {u.readiness} · strength {u.strength}</div>
                <div style={{ fontSize: 11, color: '#555' }}>hdg {u.heading}° · {u.speed} km/h</div>
              </div>
            </Popup>
          </CircleMarker>
        </React.Fragment>
      ))}

      {/* Threat tracks — red/amber/yellow by classification */}
      {threats.map((t) => {
        const color = THREAT_COLOR[t.classification] || '#eab308';
        const crit = t.threat_level === 'critical';
        return (
          <React.Fragment key={t.id}>
            {t.speed > 0 && (
              <Polyline positions={headingLine(t.lat, t.lng, t.heading)} pathOptions={{ color, weight: 1.5, opacity: 0.7, dashArray: '4 3' }} />
            )}
            <CircleMarker
              center={[t.lat, t.lng]}
              radius={crit ? 10 : 8}
              pathOptions={{ color, fillColor: color, fillOpacity: crit ? 0.5 : 0.35, weight: crit ? 3 : 2 }}
            >
              <Popup>
                <div style={{ fontFamily: 'monospace', minWidth: 170 }}>
                  <div style={{ fontWeight: 700, color }}>{t.designation}</div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase' }}>{t.classification} · {t.threat_level}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>type: {t.type}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>hdg {t.heading}° · {t.speed} km/h · conf {(t.confidence * 100).toFixed(0)}%</div>
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}

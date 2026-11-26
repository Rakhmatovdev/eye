'use client';
import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Polygon, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Unit, Threat, Sensor } from '../../lib/api';

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

// Calculate camera FOV vision cone polygon points
function calcVisionCone(lat: number, lng: number, headingDeg = 0, fovDeg = 60, rangeMeters = 400): [number, number][] {
  const R = 6371000; // meters
  const startAngle = headingDeg - fovDeg / 2.0;
  const endAngle = headingDeg + fovDeg / 2.0;
  const steps = 8;
  const points: [number, number][] = [[lat, lng]];

  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + ((endAngle - startAngle) * i) / steps;
    const radBearing = (angle * Math.PI) / 180;
    const radLat = (lat * Math.PI) / 180;
    const radLng = (lng * Math.PI) / 180;
    const angDist = rangeMeters / R;

    const resLat = Math.asin(
      Math.sin(radLat) * Math.cos(angDist) +
      Math.cos(radLat) * Math.sin(angDist) * Math.cos(radBearing)
    );
    const resLng = radLng + Math.atan2(
      Math.sin(radBearing) * Math.sin(angDist) * Math.cos(radLat),
      Math.cos(angDist) - Math.sin(radLat) * Math.sin(resLat)
    );

    points.push([(resLat * 180) / Math.PI, (resLng * 180) / Math.PI]);
  }

  points.push([lat, lng]);
  return points;
}

export default function CopMap({
  units,
  threats,
  sensors = [],
}: {
  units: Unit[];
  threats: Threat[];
  sensors?: Sensor[];
}) {
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

      {/* Surveillance Camera Vision Cones & Fixed Sensors */}
      {sensors.map((s) => {
        const cone = calcVisionCone(s.lat, s.lng, s.heading || 0, s.fov || 60, Math.min(s.coverage_radius || 500, 1500));
        return (
          <React.Fragment key={s.id}>
            <Polygon
              positions={cone}
              pathOptions={{
                color: '#06b6d4',
                fillColor: '#0891b2',
                fillOpacity: 0.15,
                weight: 1,
                dashArray: '3 3',
              }}
            />
            <CircleMarker
              center={[s.lat, s.lng]}
              radius={6}
              pathOptions={{
                color: '#22d3ee',
                fillColor: s.status === 'online' ? '#10b981' : '#f59e0b',
                fillOpacity: 0.9,
                weight: 1.5,
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'monospace', minWidth: 200 }}>
                  <div style={{ fontWeight: 700, color: '#0891b2' }}>{s.name}</div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b' }}>
                    {s.type} · {s.status} · {s.stream_protocol || 'RTSP'}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569' }}>
                    HDG: {s.heading || 0}° · FOV: {s.fov || 60}° · {s.area}
                  </div>
                  <div style={{ marginTop: 6, borderTop: '1px solid #e2e8f0', paddingTop: 4 }}>
                    <a
                      href={`/surveillance`}
                      style={{ fontSize: 11, color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}
                    >
                      Jonli oqimni ochish &rarr;
                    </a>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        );
      })}

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

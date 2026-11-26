'use client';
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface ReplayPoint {
  lat: number;
  lng: number;
  timestamp: number;
  sensorName: string;
}

export interface ReplayTrack {
  id: string;
  name: string;
  positions: ReplayPoint[];
}

const TRACK_COLORS = ['#22d3ee', '#f59e0b', '#a78bfa', '#34d399', '#f43f5e', '#60a5fa', '#eab308', '#fb7185'];

function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TRACK_COLORS[hash % TRACK_COLORS.length];
}

// Renders each track's position history up to `currentTime` as a fading
// trail + a live marker at the most recent sighting at-or-before that time.
// Tracks with no sighting yet at `currentTime` are simply not rendered —
// this makes entities "appear" on the map at their first real detection,
// same way an analyst would only know about a sighting once it happened.
export default function ReplayMap({ tracks, currentTime }: { tracks: ReplayTrack[]; currentTime: number }) {
  const frames = useMemo(() => {
    return tracks
      .map((track) => {
        const seen = track.positions.filter((p) => p.timestamp <= currentTime);
        if (seen.length === 0) return null;
        const current = seen[seen.length - 1];
        return { id: track.id, name: track.name, current, trail: seen, color: colorFor(track.id) };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);
  }, [tracks, currentTime]);

  const allPositions = tracks.flatMap((t) => t.positions);
  const center: [number, number] = allPositions.length
    ? [
        allPositions.reduce((s, p) => s + p.lat, 0) / allPositions.length,
        allPositions.reduce((s, p) => s + p.lng, 0) / allPositions.length,
      ]
    : [41.3, 69.24];

  return (
    <MapContainer center={center} zoom={5} scrollWheelZoom style={{ height: '100%', width: '100%', background: 'var(--bg-main)' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap &copy; CARTO"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {frames.map((f) => (
        <React.Fragment key={f.id}>
          {f.trail.length > 1 && (
            <Polyline
              positions={f.trail.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: f.color, weight: 2, opacity: 0.45, dashArray: '3 5' }}
            />
          )}
          {f.trail.slice(0, -1).map((p, i) => (
            <CircleMarker
              key={i}
              center={[p.lat, p.lng]}
              radius={3}
              pathOptions={{ color: f.color, fillColor: f.color, fillOpacity: 0.35, weight: 1, opacity: 0.5 }}
            />
          ))}
          <CircleMarker
            center={[f.current.lat, f.current.lng]}
            radius={9}
            pathOptions={{ color: f.color, fillColor: f.color, fillOpacity: 0.85, weight: 2 }}
            className="entity-selected"
          >
            <Popup>
              <div style={{ fontFamily: 'monospace', minWidth: 170 }}>
                <div style={{ fontWeight: 700, color: f.color }}>{f.name}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{f.current.sensorName}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{new Date(f.current.timestamp).toLocaleString()}</div>
              </div>
            </Popup>
          </CircleMarker>
        </React.Fragment>
      ))}
    </MapContainer>
  );
}

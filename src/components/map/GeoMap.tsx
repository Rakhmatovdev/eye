'use client';
import React, { useEffect } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  Polygon,
  Popup,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Basemap, MapCanvasProps, MapCoordinate, MapFocus } from './types';

export type { GeoPoint, SensorPoint, LiveMapPoint, MapCoordinate, MapFocus, Basemap } from './types';

const SENSOR_STATUS_COLOR: Record<string, string> = {
  online: '#34d399',
  degraded: '#f59e0b',
  offline: '#ef4444',
};

const TYPE_COLOR: Record<string, string> = {
  person: '#22d3ee',
  organization: '#a78bfa',
  location: '#34d399',
  vehicle: '#f59e0b',
  phone: '#60a5fa',
  document: '#94a3b8',
  transaction: '#f43f5e',
};

const BASEMAPS: Record<Basemap, { url: string; attribution: string; maxZoom?: number }> = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 20,
  },
  topographic: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap',
    maxZoom: 17,
  },
};

function FocusController({ focus }: { focus?: MapFocus | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], focus.zoom ?? 15, { duration: 0.7 });
  }, [focus, map]);
  return null;
}

function MapEvents({ onMapClick }: { onMapClick?: (coordinate: MapCoordinate) => void }) {
  useMapEvents({
    click(event) {
      onMapClick?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

export default function GeoMap({
  points,
  sensors = [],
  livePoints = [],
  basemap = 'dark',
  focus,
  userLocation,
  measurePoints = [],
  geofencePoints = [],
  radiusAnalysis,
  onMapClick,
}: MapCanvasProps) {
  const center: [number, number] = points.length
    ? [
        points.reduce((sum, point) => sum + point.lat, 0) / points.length,
        points.reduce((sum, point) => sum + point.lng, 0) / points.length,
      ]
    : [41.3, 69.24];
  const tile = BASEMAPS[basemap];
  const measurement = measurePoints.map((point) => [point.lat, point.lng] as [number, number]);
  const geofence = geofencePoints.map((point) => [point.lat, point.lng] as [number, number]);

  return (
    <MapContainer
      center={center}
      zoom={points.length === 1 ? 13 : 6}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', background: '#07090F' }}
    >
      <TileLayer key={basemap} attribution={tile.attribution} url={tile.url} maxZoom={tile.maxZoom} />
      <ScaleControl position="bottomright" imperial={false} />
      <FocusController focus={focus} />
      <MapEvents onMapClick={onMapClick} />

      {points.map((point) => {
        const color = TYPE_COLOR[point.type] || '#22d3ee';
        const radius = 7 + Math.min(8, (point.risk_score ?? 0) / 12);
        return (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={radius}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.62, weight: 1.5 }}
          >
            <Popup>
              <div className="map-popup-content">
                <strong>{point.name}</strong>
                <span style={{ color }}>{point.type} · {point.classification}</span>
                {point.address && <small>{point.address}</small>}
                {point.risk_score != null && <small>risk: {point.risk_score}</small>}
                <small>{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</small>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {sensors.map((sensor) => {
        const color = SENSOR_STATUS_COLOR[sensor.status] || '#34d399';
        return (
          <React.Fragment key={sensor.id}>
            <Circle
              center={[sensor.lat, sensor.lng]}
              radius={sensor.coverage_radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.06, weight: 1, dashArray: '4 4' }}
            />
            <CircleMarker
              center={[sensor.lat, sensor.lng]}
              radius={5}
              pathOptions={{ color, fillColor: '#0b0f17', fillOpacity: 1, weight: 2 }}
            >
              <Popup>
                <div className="map-popup-content">
                  <strong>{sensor.name}</strong>
                  <span style={{ color }}>{sensor.type} · {sensor.status}</span>
                  <small>{sensor.area}</small>
                  <small>coverage {(sensor.coverage_radius / 1000).toFixed(1)} km</small>
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        );
      })}

      {livePoints.map((point) => (
        <CircleMarker
          key={point.id}
          center={[point.lat, point.lng]}
          radius={9}
          className="map-live-marker"
          pathOptions={{ color: '#fb7185', fillColor: '#ef4444', fillOpacity: 0.78, weight: 2 }}
        >
          <Tooltip direction="top" offset={[0, -8]}>{point.name}</Tooltip>
          <Popup>
            <div className="map-popup-content">
              <strong>{point.name}</strong>
              <span style={{ color: '#e11d48' }}>LIVE · {point.kind}</span>
              <small>{Math.round(point.confidence * 100)}% confidence</small>
              {point.area && <small>{point.area}</small>}
              <small>{new Date(point.timestamp).toLocaleString()}</small>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {userLocation && (
        <>
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={35}
            pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.12, weight: 1 }}
          />
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={6}
            pathOptions={{ color: '#e0f2fe', fillColor: '#0ea5e9', fillOpacity: 1, weight: 2 }}
          >
            <Tooltip direction="top" permanent>GPS</Tooltip>
          </CircleMarker>
        </>
      )}

      {measurement.map((position, index) => (
        <CircleMarker
          key={`measure-${index}`}
          center={position}
          radius={5}
          pathOptions={{ color: '#fde047', fillColor: '#facc15', fillOpacity: 1, weight: 2 }}
        />
      ))}
      {measurement.length === 2 && (
        <Polyline positions={measurement} pathOptions={{ color: '#fde047', weight: 3, dashArray: '8 8' }} />
      )}
      {geofence.map((position, index) => (
        <CircleMarker
          key={`geofence-${index}`}
          center={position}
          radius={4}
          pathOptions={{ color: '#c084fc', fillColor: '#a855f7', fillOpacity: 1, weight: 2 }}
        />
      ))}
      {geofence.length === 2 && (
        <Polyline positions={geofence} pathOptions={{ color: '#c084fc', weight: 2, dashArray: '5 6' }} />
      )}
      {geofence.length >= 3 && (
        <Polygon
          positions={geofence}
          pathOptions={{ color: '#c084fc', fillColor: '#9333ea', fillOpacity: 0.16, weight: 2, dashArray: '6 5' }}
        />
      )}
      {radiusAnalysis && (
        <>
          <Circle
            center={[radiusAnalysis.center.lat, radiusAnalysis.center.lng]}
            radius={radiusAnalysis.radiusMeters}
            pathOptions={{ color: '#38bdf8', fillColor: '#0ea5e9', fillOpacity: 0.12, weight: 2, dashArray: '7 5' }}
          />
          <CircleMarker
            center={[radiusAnalysis.center.lat, radiusAnalysis.center.lng]}
            radius={4}
            pathOptions={{ color: '#e0f2fe', fillColor: '#0284c7', fillOpacity: 1, weight: 2 }}
          />
        </>
      )}
    </MapContainer>
  );
}

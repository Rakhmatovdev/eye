'use client';
import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { mockEntities, type Entity } from '../../data/mockEntities';
import { mockSensors } from '../../data/mockSensors';
import { entitiesApi, sensorsApi } from '../../lib/api';
import type { GeoPoint, SensorPoint } from '../../components/map/GeoMap';
import { Map as MapIcon, Filter, MapPin, Cctv } from 'lucide-react';

// Leaflet touches `window`, so the map must render client-side only.
const GeoMap = dynamic(() => import('../../components/map/GeoMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-gray-500 font-mono text-xs bg-[#07090F]">
      Initializing geospatial layer…
    </div>
  ),
});

function toPoints(entities: Entity[]): GeoPoint[] {
  return entities
    .filter((e) => e.geo && Number.isFinite(e.geo.lat) && Number.isFinite(e.geo.lng))
    .map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      classification: e.classification,
      lat: e.geo!.lat,
      lng: e.geo!.lng,
      address: e.geo!.address,
      risk_score: e.risk_score,
    }));
}

export default function MapPage() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [showSensors, setShowSensors] = useState(true);

  const { data, isError } = useQuery({
    queryKey: ['entities', 'map'],
    queryFn: () => entitiesApi.list(),
  });
  const sensorsQ = useQuery({ queryKey: ['sensors', 'map'], queryFn: () => sensorsApi.list() });

  const usingFallback = isError;
  const source: Entity[] = usingFallback ? mockEntities : data ?? [];
  const sensorSrc = sensorsQ.isError ? mockSensors : sensorsQ.data ?? [];

  const points = useMemo(() => {
    const all = toPoints(source);
    return typeFilter === 'all' ? all : all.filter((p) => p.type === typeFilter);
  }, [source, typeFilter]);

  const sensors: SensorPoint[] = useMemo(
    () =>
      showSensors
        ? sensorSrc.map((s) => ({
            id: s.id, name: s.name, type: s.type, status: s.status,
            lat: s.lat, lng: s.lng, area: s.area, coverage_radius: s.coverage_radius,
          }))
        : [],
    [sensorSrc, showSensors]
  );

  const types = useMemo(
    () => Array.from(new Set(toPoints(source).map((p) => p.type))).sort(),
    [source]
  );

  return (
    <WorkspaceLayout>
      <div className="h-full flex flex-col">
        {/* Header / controls */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-800/60 bg-[#0c0e17]/60 flex items-center justify-between gap-4 flex-wrap z-[500]">
          <div>
            <h1 className="text-lg font-bold font-mono tracking-wide text-white uppercase flex items-center gap-2">
              <MapIcon size={17} className="text-cyan-400" /> Geospatial Map
            </h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">
              Correlated geo coordinates of monitored entities.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500 uppercase tracking-wider">
              <Filter size={14} />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none font-mono capitalize"
            >
              <option value="all">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={() => setShowSensors((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all ${
                showSensors
                  ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                  : 'text-gray-500 border-gray-800 bg-gray-950'
              }`}
            >
              <Cctv size={13} /> Sensors
            </button>
            <span className="text-[10px] font-mono text-gray-600 flex items-center gap-2">
              {usingFallback && (
                <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                  DEMO DATA (API offline)
                </span>
              )}
              <span className="flex items-center gap-1"><MapPin size={11} /> {points.length} pins · {sensors.length} sensors</span>
            </span>
          </div>
        </div>

        {/* Map fills the rest */}
        <div className="flex-1 min-h-0 relative">
          <GeoMap points={points} sensors={sensors} />
        </div>
      </div>
    </WorkspaceLayout>
  );
}

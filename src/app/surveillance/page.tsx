'use client';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { sensorsApi, type Sensor, type Detection } from '../../lib/api';
import { useLiveFeed } from '../../lib/useLiveFeed';
import { useT } from '../../lib/i18n';
import { mockSensors, mockDetections, mockSensorStats } from '../../data/mockSensors';
import {
  Cctv, Plane, Radar, RadioTower, Video, Signal, Filter, MapPin, ScanFace,
  Car, Thermometer, Waves, Activity, ShieldAlert, CircleDot,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const SENSOR_ICON: Record<string, LucideIcon> = {
  camera: Cctv, drone: Plane, radar: Radar, sigint: RadioTower, thermal: Thermometer, motion: Waves,
};
const KIND_ICON: Record<string, LucideIcon> = {
  face_match: ScanFace, plate_match: Car, thermal: Thermometer, signal: Signal, motion: Waves,
};
const STATUS_DOT: Record<string, string> = {
  online: 'text-emerald-400', degraded: 'text-amber-400', offline: 'text-red-500',
};

function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - +new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function SurveillancePage() {
  const t = useT();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Sensor | null>(null);

  const sensorsQ = useQuery({ queryKey: ['sensors'], queryFn: () => sensorsApi.list() });
  const detsQ = useQuery({ queryKey: ['detections'], queryFn: () => sensorsApi.detections({ limit: 60 }) });
  const statsQ = useQuery({ queryKey: ['sensor-stats'], queryFn: () => sensorsApi.stats() });

  const { items: liveItems, status: liveStatus } = useLiveFeed(20);

  const offline = sensorsQ.isError;
  const sensors: Sensor[] = offline ? mockSensors : sensorsQ.data ?? [];
  const baseDetections: Detection[] = detsQ.isError ? mockDetections : detsQ.data ?? [];
  // Prepend live WS frames onto the seeded/fetched feed so the panel never
  // goes empty and always shows the base demo data underneath.
  const detections: Detection[] = [...liveItems, ...baseDetections].slice(0, 60);
  const stats = statsQ.isError ? mockSensorStats : statsQ.data ?? mockSensorStats;

  const filtered = useMemo(
    () =>
      sensors.filter(
        (s) =>
          (typeFilter === 'all' || s.type === typeFilter) &&
          (statusFilter === 'all' || s.status === statusFilter)
      ),
    [sensors, typeFilter, statusFilter]
  );

  const active = selected ?? filtered[0] ?? sensors[0];

  const tiles = [
    { label: t('surveillance_tile_sensors'), value: stats.total, color: 'text-cyan-400', icon: Video },
    { label: t('surveillance_tile_online'), value: stats.online, color: 'text-emerald-400', icon: Activity },
    { label: t('surveillance_tile_degraded'), value: stats.degraded, color: 'text-amber-400', icon: Signal },
    { label: t('surveillance_offline_badge'), value: stats.offline, color: 'text-red-500', icon: ShieldAlert },
    { label: t('surveillance_tile_hits24h'), value: stats.detections_24h, color: 'text-violet-400', icon: CircleDot },
    { label: t('surveillance_tile_identified'), value: stats.identified_hits, color: 'text-fuchsia-400', icon: ScanFace },
  ];

  return (
    <WorkspaceLayout>
      <div className="p-6 space-y-5 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold font-mono tracking-wide text-white uppercase flex items-center gap-2">
              <Cctv size={18} className="text-cyan-400" /> {t('surveillance_title')}
            </h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">
              {t('surveillance_subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {liveStatus === 'live' ? (
              <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {t('surveillance_live_badge')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-500 border border-gray-700/40 text-[10px] font-mono uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                {liveStatus === 'connecting' ? t('surveillance_connecting_badge') : t('surveillance_offline_badge')}
              </span>
            )}
            {offline && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-mono">
                {t('common_demo_data_badge')}
              </span>
            )}
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div key={tile.label} className="bg-[#0e1220]/70 border border-gray-800/70 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xxs font-mono text-gray-500 uppercase tracking-wider">{tile.label}</span>
                  <Icon size={13} />
                </div>
                <div className={`text-2xl font-bold font-mono mt-1 ${tile.color}`}>{tile.value}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: live feed + sensor grid */}
          <div className="lg:col-span-2 space-y-5">
            {/* Simulated live feed */}
            {active && <LiveFeed sensor={active} />}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center bg-[#0c0e17]/40 p-3 border border-gray-800/60 rounded-2xl">
              <Filter size={14} className="text-gray-500" />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none font-mono capitalize">
                <option value="all">{t('common_all_types')}</option>
                <option value="camera">{t('surveillance_type_camera')}</option>
                <option value="drone">{t('surveillance_type_drone')}</option>
                <option value="radar">{t('surveillance_type_radar')}</option>
                <option value="sigint">{t('surveillance_type_sigint')}</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none font-mono capitalize">
                <option value="all">{t('surveillance_status_all')}</option>
                <option value="online">{t('surveillance_tile_online')}</option>
                <option value="degraded">{t('surveillance_tile_degraded')}</option>
                <option value="offline">{t('surveillance_offline_badge')}</option>
              </select>
              <span className="text-[10px] font-mono text-gray-600 ml-auto">{filtered.length} {t('surveillance_sensors_suffix')}</span>
            </div>

            {/* Sensor grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((s) => {
                const Icon = SENSOR_ICON[s.type] || Video;
                const isActive = active?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={`text-left bg-[#0e1220]/60 border rounded-2xl p-4 transition-all ${
                      isActive ? 'border-cyan-500/50 shadow shadow-cyan-500/10' : 'border-gray-800/60 hover:border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-cyan-400"><Icon size={15} />
                        <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">{s.type}</span>
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] font-mono ${STATUS_DOT[s.status]}`}>
                        <CircleDot size={9} /> {s.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-gray-200 font-mono mt-2 truncate">{s.name}</h3>
                    <div className="text-xxs font-mono text-gray-500 mt-1 flex items-center gap-1"><MapPin size={10} /> {s.area}</div>
                    <div className="flex justify-between text-xxs font-mono text-gray-600 mt-2 pt-2 border-t border-gray-800/40">
                      <span>{s.resolution}</span>
                      <span>{(s.coverage_radius / 1000).toFixed(s.coverage_radius >= 1000 ? 1 : 2)} km</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: detection feed */}
          <div className="bg-[#0c0e17]/50 border border-gray-800/60 rounded-2xl p-4 h-fit">
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-300 flex items-center gap-2 mb-3">
              <ScanFace size={14} className="text-fuchsia-400" /> {t('surveillance_detection_feed_title')}
            </h2>
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {detections.map((d) => {
                const Icon = KIND_ICON[d.kind] || CircleDot;
                const identified = !!d.entity_id;
                return (
                  <div key={d.id} className="bg-[#0e1220]/60 border border-gray-800/50 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-gray-500">
                        <Icon size={11} /> {d.kind.replace('_', ' ')}
                      </span>
                      <span className="text-xxs font-mono text-gray-600">{timeAgo(d.timestamp)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {identified ? (
                        <Link href={`/entity/${d.entity_id}`} className="text-sm font-bold font-mono text-cyan-400 hover:underline truncate">
                          {d.entity_name}
                        </Link>
                      ) : (
                        <span className="text-sm font-bold font-mono text-gray-500 truncate">{d.entity_name}</span>
                      )}
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                        d.confidence >= 0.85 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                        d.confidence >= 0.7 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                        'text-gray-400 border-gray-600/30 bg-gray-500/10'
                      }`}>
                        {(d.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xxs font-mono text-gray-600 mt-1.5 flex items-center gap-1 truncate">
                      <Video size={10} /> {d.sensor_name}
                    </div>
                  </div>
                );
              })}
              {detections.length === 0 && (
                <p className="text-xs text-gray-600 font-mono py-6 text-center">{t('surveillance_no_detections')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}

// Simulated camera/sensor live feed — a stylised placeholder (no real video).
function LiveFeed({ sensor }: { sensor: Sensor }) {
  const t = useT();
  const Icon = SENSOR_ICON[sensor.type] || Video;
  return (
    <div className="relative bg-black border border-gray-800/70 rounded-2xl overflow-hidden aspect-video">
      {/* scanline / grid backdrop */}
      <div className="absolute inset-0 opacity-30"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #0f0 0, #0f0 1px, transparent 1px, transparent 4px)', mixBlendMode: 'overlay' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-2">
        <Icon size={40} />
        <span className="text-[10px] font-mono uppercase tracking-widest">{t('surveillance_simulated_feed')} · {sensor.feed_url}</span>
      </div>
      {/* HUD overlays */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-red-400 bg-black/60 px-2 py-1 rounded">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {t('surveillance_rec_badge')}
        </span>
        <span className="text-[10px] font-mono text-gray-300 bg-black/60 px-2 py-1 rounded uppercase">{sensor.type}</span>
      </div>
      <div className="absolute top-3 right-3 text-[10px] font-mono text-gray-400 bg-black/60 px-2 py-1 rounded uppercase">
        {sensor.classification}
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-gray-300">
        <span className="bg-black/60 px-2 py-1 rounded truncate">{sensor.name}</span>
        <span className="bg-black/60 px-2 py-1 rounded">{sensor.lat.toFixed(4)}, {sensor.lng.toFixed(4)}</span>
      </div>
      {/* targeting reticle */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-cyan-400/40 rounded">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/30" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400/30" />
      </div>
    </div>
  );
}

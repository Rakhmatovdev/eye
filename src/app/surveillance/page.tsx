'use client';
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import DataBoundary from '../../components/common/DataBoundary';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { sensorsApi, type Sensor, type Detection, type PlateRecognitionResult } from '../../lib/api';
import { useLiveFeed } from '../../lib/useLiveFeed';
import { useT } from '../../lib/i18n';
import {
  Cctv, Plane, Radar, RadioTower, Video, Signal, Filter, MapPin, ScanFace,
  Car, Thermometer, Waves, Activity, ShieldAlert, CircleDot, Search, Shield,
  Compass, Radio, CheckCircle, AlertTriangle, Play, RefreshCw, Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const SENSOR_ICON: Record<string, LucideIcon> = {
  camera: Cctv, drone: Plane, radar: Radar, sigint: RadioTower, thermal: Thermometer, motion: Waves,
};
const KIND_ICON: Record<string, LucideIcon> = {
  face_match: ScanFace, plate_match: Car, thermal: Thermometer, signal: Signal, motion: Waves,
};
const STATUS_DOT: Record<string, string> = {
  online: 'text-[var(--accent-emerald-soft)]', degraded: 'text-[var(--accent-amber-soft)]', offline: 'text-red-500',
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
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'cameras' | 'lpr' | 'face'>('cameras');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Sensor | null>(null);

  // LPR state
  const [testPlate, setTestPlate] = useState('01 A 777 AA');
  const [lprResult, setLprResult] = useState<PlateRecognitionResult | null>(null);
  const [lprLoading, setLprLoading] = useState(false);
  const [lprError, setLprError] = useState('');
  const [ingestSuccess, setIngestSuccess] = useState('');

  const sensorsQ = useQuery({ queryKey: ['sensors'], queryFn: () => sensorsApi.list() });
  const detsQ = useQuery({ queryKey: ['detections'], queryFn: () => sensorsApi.detections({ limit: 60 }) });
  const statsQ = useQuery({ queryKey: ['sensor-stats'], queryFn: () => sensorsApi.stats() });

  const { items: liveItems, status: liveStatus } = useLiveFeed(20);

  const sensors: Sensor[] = sensorsQ.data ?? [];
  const baseDetections: Detection[] = detsQ.data ?? [];
  const detections: Detection[] = [...liveItems, ...baseDetections].slice(0, 60);
  const stats = statsQ.data;

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

  const handleRecognizePlate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testPlate.trim()) return;
    setLprLoading(true);
    setLprError('');
    setIngestSuccess('');
    try {
      const res = await sensorsApi.recognizePlate(testPlate.trim());
      setLprResult(res);
    } catch (err: unknown) {
      setLprError(err instanceof Error ? err.message : 'Tahlil xatosi');
    } finally {
      setLprLoading(false);
    }
  };

  const handleSimulateDetection = async () => {
    if (!active || !lprResult) return;
    try {
      await sensorsApi.ingestDetection(active.id, {
        kind: 'plate_match',
        plate_number: lprResult.plate.normalized,
        confidence: 0.98,
        vehicle_make: 'Chevrolet',
        vehicle_color: 'Oq',
      });
      setIngestSuccess(`Kameradan (${active.name}) deteksiya muvaffaqiyatli uzatildi!`);
      void qc.invalidateQueries({ queryKey: ['detections'] });
      void qc.invalidateQueries({ queryKey: ['sensor-stats'] });
    } catch (err: unknown) {
      setLprError(err instanceof Error ? err.message : 'Simulyatsiya xatosi');
    }
  };

  const tiles = [
    { label: t('surveillance_tile_sensors'), value: stats?.total, color: 'text-[var(--accent-cyan-soft)]', icon: Video },
    { label: t('surveillance_tile_online'), value: stats?.online, color: 'text-[var(--accent-emerald-soft)]', icon: Activity },
    { label: t('surveillance_tile_degraded'), value: stats?.degraded, color: 'text-[var(--accent-amber-soft)]', icon: Signal },
    { label: t('surveillance_offline_badge'), value: stats?.offline, color: 'text-red-500', icon: ShieldAlert },
    { label: t('surveillance_tile_hits24h'), value: stats?.detections_24h, color: 'text-[var(--accent-violet-soft)]', icon: CircleDot },
    { label: t('surveillance_tile_identified'), value: stats?.identified_hits, color: 'text-fuchsia-400', icon: ScanFace },
  ];

  return (
    <WorkspaceLayout>
      <DataBoundary queries={[sensorsQ, detsQ, statsQ]}>
      <div className="p-6 space-y-5 h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold font-mono tracking-wide text-[var(--chrome-text-white)] uppercase flex items-center gap-2">
              <Cctv size={18} className="text-[var(--accent-cyan-soft)]" /> {t('surveillance_title')}
            </h1>
            <p className="text-[var(--chrome-text-500)] text-xs font-mono mt-0.5">
              {t('surveillance_subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {liveStatus === 'live' ? (
              <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-[var(--accent-emerald-soft)] border border-emerald-500/20 text-[10px] font-mono uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {t('surveillance_live_badge')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--chrome-bg-500)_10%,transparent)] text-[var(--chrome-text-500)] border border-[color-mix(in_srgb,var(--chrome-border-700)_40%,transparent)] text-[10px] font-mono uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--chrome-bg-600)]" />
                {liveStatus === 'connecting' ? t('surveillance_connecting_badge') : t('surveillance_offline_badge')}
              </span>
            )}
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div key={tile.label} className="bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_70%,transparent)] rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xxs font-mono text-[var(--chrome-text-500)] uppercase tracking-wider">{tile.label}</span>
                  <Icon size={13} />
                </div>
                <div className={`text-2xl font-bold font-mono mt-1 ${tile.color}`}>{tile.value}</div>
              </div>
            );
          })}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] pb-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('cameras')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'cameras'
                ? 'bg-cyan-500/10 text-[var(--accent-cyan-soft)] border border-cyan-500/30'
                : 'text-[var(--chrome-text-500)] hover:text-[var(--chrome-text-200)]'
            }`}
          >
            <Video size={14} /> {t('surveillance_tab_cameras')}
          </button>
          <button
            onClick={() => setActiveTab('lpr')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'lpr'
                ? 'bg-cyan-500/10 text-[var(--accent-cyan-soft)] border border-cyan-500/30'
                : 'text-[var(--chrome-text-500)] hover:text-[var(--chrome-text-200)]'
            }`}
          >
            <Car size={14} /> {t('surveillance_tab_lpr')}
          </button>
          <button
            onClick={() => setActiveTab('face')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'face'
                ? 'bg-cyan-500/10 text-[var(--accent-cyan-soft)] border border-cyan-500/30'
                : 'text-[var(--chrome-text-500)] hover:text-[var(--chrome-text-200)]'
            }`}
          >
            <ScanFace size={14} /> {t('surveillance_tab_face')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: main area based on active tab */}
          <div className="lg:col-span-2 space-y-5">
            {activeTab === 'cameras' && (
              <>
                {/* Live stream / HUD player */}
                {active && <LiveFeed sensor={active} />}

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center bg-[color-mix(in_srgb,var(--bg-card)_40%,transparent)] p-3 border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-2xl">
                  <Filter size={14} className="text-[var(--chrome-text-500)]" />
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl px-3 py-1.5 text-xs text-[var(--chrome-text-300)] focus:outline-none font-mono capitalize">
                    <option value="all">{t('common_all_types')}</option>
                    <option value="camera">{t('surveillance_type_camera')}</option>
                    <option value="drone">{t('surveillance_type_drone')}</option>
                    <option value="radar">{t('surveillance_type_radar')}</option>
                    <option value="sigint">{t('surveillance_type_sigint')}</option>
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl px-3 py-1.5 text-xs text-[var(--chrome-text-300)] focus:outline-none font-mono capitalize">
                    <option value="all">{t('surveillance_status_all')}</option>
                    <option value="online">{t('surveillance_tile_online')}</option>
                    <option value="degraded">{t('surveillance_tile_degraded')}</option>
                    <option value="offline">{t('surveillance_offline_badge')}</option>
                  </select>
                  <span className="text-[10px] font-mono text-[var(--chrome-text-600)] ml-auto">{filtered.length} {t('surveillance_sensors_suffix')}</span>
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
                        className={`text-left bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border rounded-2xl p-4 transition-all ${
                          isActive ? 'border-cyan-500/50 shadow shadow-cyan-500/10' : 'border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] hover:border-cyan-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-[var(--accent-cyan-soft)]"><Icon size={15} />
                            <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--chrome-text-500)]">{s.type}</span>
                          </span>
                          <span className={`flex items-center gap-1 text-[10px] font-mono ${STATUS_DOT[s.status]}`}>
                            <CircleDot size={9} /> {s.status}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-[var(--chrome-text-200)] font-mono mt-2 truncate">{s.name}</h3>
                        <div className="text-xxs font-mono text-[var(--chrome-text-500)] mt-1 flex items-center gap-1"><MapPin size={10} /> {s.area}</div>
                        <div className="flex justify-between text-xxs font-mono text-[var(--chrome-text-600)] mt-2 pt-2 border-t border-[color-mix(in_srgb,var(--chrome-border-800)_40%,transparent)]">
                          <span>{s.stream_protocol ? s.stream_protocol.toUpperCase() : 'RTSP'} · {s.resolution || '1080p'}</span>
                          <span>HDG {s.heading || 0}° · {(s.coverage_radius / 1000).toFixed(s.coverage_radius >= 1000 ? 1 : 2)} km</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === 'lpr' && (
              <div className="space-y-4 bg-[color-mix(in_srgb,var(--bg-card)_50%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold font-mono text-[var(--chrome-text-200)] flex items-center gap-2">
                    <Car size={16} className="text-[var(--accent-cyan-soft)]" /> O&apos;zbekiston Davlat Raqamlari (ANPR / LPR) Tahlili
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-[var(--accent-cyan-soft)] border border-cyan-500/20">
                    O&apos;zDSt / YHXX Standarti
                  </span>
                </div>

                <form onSubmit={handleRecognizePlate} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={testPlate}
                      onChange={(e) => setTestPlate(e.target.value)}
                      placeholder={t('surveillance_lpr_input_placeholder')}
                      className="w-full bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl px-4 py-2 text-sm font-mono text-[var(--chrome-text-100)] uppercase focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={lprLoading}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    {lprLoading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                    {t('surveillance_lpr_recognize_btn')}
                  </button>
                </form>

                {/* Quick samples */}
                <div className="flex flex-wrap gap-2 items-center text-xxs font-mono text-[var(--chrome-text-500)]">
                  <span>Namuna raqamlar:</span>
                  {['01 A 777 AA', '01 777 AAA', '01 001 PAA', '30 B 123 CD', 'CMD 01 01'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setTestPlate(p); }}
                      className="px-2 py-1 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] hover:border-cyan-500/40 rounded-lg text-[var(--chrome-text-300)]"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {lprError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-mono text-red-400">
                    {lprError}
                  </div>
                )}

                {ingestSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-400 flex items-center gap-2">
                    <CheckCircle size={14} /> {ingestSuccess}
                  </div>
                )}

                {lprResult && (
                  <div className="p-4 bg-[var(--bg-main)] border border-[var(--chrome-border-700)] rounded-xl space-y-3 font-mono">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-white text-black font-extrabold text-base rounded border border-gray-300 tracking-wider">
                          {lprResult.plate.formatted}
                        </div>
                        {lprResult.plate.is_valid ? (
                          <span className="flex items-center gap-1 text-[11px] text-[var(--accent-emerald-soft)]">
                            <CheckCircle size={12} /> Yaroqli format
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-amber-400">
                            <AlertTriangle size={12} /> Noma&apos;lum format
                          </span>
                        )}
                      </div>
                      <span className="text-xs uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {lprResult.plate.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-[var(--chrome-border-800)]">
                      <div>
                        <span className="text-[var(--chrome-text-500)] text-[10px] block">{t('surveillance_lpr_region')}</span>
                        <span className="text-[var(--chrome-text-200)] font-bold">{lprResult.plate.region_name || 'Noma\'lum'} ({lprResult.plate.region_code})</span>
                      </div>
                      <div>
                        <span className="text-[var(--chrome-text-500)] text-[10px] block">{t('surveillance_lpr_category')}</span>
                        <span className="text-[var(--chrome-text-200)] capitalize">{lprResult.plate.category}</span>
                      </div>
                      <div>
                        <span className="text-[var(--chrome-text-500)] text-[10px] block">Raqam / Seriya</span>
                        <span className="text-[var(--chrome-text-200)]">{lprResult.plate.number} / {lprResult.plate.series}</span>
                      </div>
                    </div>

                    {/* Matched entity or Watchlist badge */}
                    {lprResult.entity_id ? (
                      <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xxs text-[var(--chrome-text-500)] uppercase block">{t('surveillance_lpr_matched_entity')}</span>
                          <Link href={`/entity/${lprResult.entity_id}`} className="text-sm font-bold text-[var(--accent-cyan-soft)] hover:underline">
                            {lprResult.entity_name}
                          </Link>
                        </div>
                        {lprResult.watchlist && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-xs font-bold animate-pulse">
                            {t('surveillance_lpr_watchlist_alert')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--chrome-text-500)] italic">
                        Bazada ushbu raqamga bog&apos;langan transport ro&apos;yxatga olinmagan (yangi obyekt sifatida kiritilishi mumkin).
                      </p>
                    )}

                    {/* Action: simulate camera detection */}
                    {active && (
                      <button
                        type="button"
                        onClick={handleSimulateDetection}
                        className="w-full mt-2 py-2 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 border border-cyan-500/30 rounded-xl text-xs font-bold text-[var(--accent-cyan-soft)] transition-all flex items-center justify-center gap-2"
                      >
                        <Send size={13} /> {t('surveillance_lpr_simulate_btn')} ({active.name})
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'face' && (
              <div className="space-y-4 bg-[color-mix(in_srgb,var(--bg-card)_50%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-2xl p-5 font-mono">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[var(--chrome-text-200)] flex items-center gap-2">
                    <ScanFace size={16} className="text-fuchsia-400" /> 512-O&apos;lchamli Vektorli Biometrik Qidiruv
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                    Kosinus O&apos;xshashlik &ge; 0.82
                  </span>
                </div>
                <p className="text-xs text-[var(--chrome-text-500)]">
                  Video kadrlaridan ajratilgan yuz deskriptorlari (512-d embeddings) millisekundlarda qidiruvdagi shaxslar (Watchlist) va shaxslar ma&apos;lumotlar bazasi bilan solishtiriladi.
                </p>
                <div className="p-4 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[var(--chrome-text-300)]">
                    <span>Neyrotarmoq modeli:</span>
                    <span className="font-bold text-[var(--accent-cyan-soft)]">ResNet-50 / InsightFace (512-d)</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--chrome-text-300)]">
                    <span>Moslik ostonasi:</span>
                    <span className="font-bold text-emerald-400">0.82 (High Confidence)</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--chrome-text-300)]">
                    <span>Watchlist integratsiyasi:</span>
                    <span className="font-bold text-emerald-400">Faol (Real-time Alert Push)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: detection feed */}
          <div className="bg-[color-mix(in_srgb,var(--bg-card)_50%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-2xl p-4 h-fit">
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--chrome-text-300)] flex items-center gap-2 mb-3">
              <ScanFace size={14} className="text-fuchsia-400" /> {t('surveillance_detection_feed_title')}
            </h2>
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {detections.map((d) => {
                const Icon = KIND_ICON[d.kind] || CircleDot;
                const identified = !!d.entity_id;
                return (
                  <div key={d.id} className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_50%,transparent)] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-[var(--chrome-text-500)]">
                        <Icon size={11} /> {d.kind.replace('_', ' ')}
                      </span>
                      <span className="text-xxs font-mono text-[var(--chrome-text-600)]">{timeAgo(d.timestamp)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {identified ? (
                        <Link href={`/entity/${d.entity_id}`} className="text-sm font-bold font-mono text-[var(--accent-cyan-soft)] hover:underline truncate">
                          {d.entity_name}
                        </Link>
                      ) : (
                        <span className="text-sm font-bold font-mono text-[var(--chrome-text-500)] truncate">{d.entity_name}</span>
                      )}
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                        d.confidence >= 0.85 ? 'text-[var(--accent-emerald-soft)] border-emerald-500/30 bg-emerald-500/10' :
                        d.confidence >= 0.7 ? 'text-[var(--accent-amber-soft)] border-amber-500/30 bg-amber-500/10' :
                        'text-[var(--chrome-text-400)] border-[color-mix(in_srgb,var(--chrome-border-600)_30%,transparent)] bg-[color-mix(in_srgb,var(--chrome-bg-500)_10%,transparent)]'
                      }`}>
                        {(d.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    {d.plate_number && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xxs font-mono font-bold px-1.5 py-0.5 bg-white text-black rounded border">
                          {d.plate_number}
                        </span>
                        {d.vehicle_make && (
                          <span className="text-xxs font-mono text-[var(--chrome-text-500)]">
                            {d.vehicle_make} {d.vehicle_color}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-xxs font-mono text-[var(--chrome-text-600)] mt-1.5 flex items-center gap-1 truncate">
                      <Video size={10} /> {d.sensor_name}
                    </div>
                  </div>
                );
              })}
              {detections.length === 0 && (
                <p className="text-xs text-[var(--chrome-text-600)] font-mono py-6 text-center">{t('surveillance_no_detections')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DataBoundary>
    </WorkspaceLayout>
  );
}

// Camera/sensor live feed HUD player with snapshot API integration
function LiveFeed({ sensor }: { sensor: Sensor }) {
  const t = useT();
  const Icon = SENSOR_ICON[sensor.type] || Video;
  const snapshotSrc = `/api/v1/sensors/${sensor.id}/snapshot?t=${Date.now()}`;

  return (
    <div className="relative bg-black border border-[color-mix(in_srgb,var(--chrome-border-800)_70%,transparent)] rounded-2xl overflow-hidden aspect-video">
      {/* Real live snapshot frame from backend or fallback */}
      <img
        src={snapshotSrc}
        alt={sensor.name}
        className="absolute inset-0 w-full h-full object-cover opacity-90"
        onError={(e) => {
          // Fallback if snapshot image endpoint has connection delay
          (e.target as HTMLElement).style.display = 'none';
        }}
      />

      {/* Scanline / grid backdrop */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #0f0 0, #0f0 1px, transparent 1px, transparent 4px)', mixBlendMode: 'overlay' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-transparent pointer-events-none" />

      {/* HUD overlays */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--accent-red-soft)] bg-black/70 px-2 py-1 rounded border border-red-500/30">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {t('surveillance_rec_badge')}
        </span>
        <span className="text-[10px] font-mono text-[var(--accent-cyan-soft)] bg-black/70 px-2 py-1 rounded border border-cyan-500/30 uppercase">
          {sensor.stream_protocol ? sensor.stream_protocol.toUpperCase() : 'RTSP'}
        </span>
        <span className="text-[10px] font-mono text-[var(--chrome-text-300)] bg-black/70 px-2 py-1 rounded uppercase">
          {sensor.type}
        </span>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-2">
        <span className="text-[10px] font-mono text-[var(--accent-emerald-soft)] bg-black/70 px-2 py-1 rounded border border-emerald-500/30 flex items-center gap-1">
          <Compass size={11} /> HDG {sensor.heading || 0}° · FOV {sensor.fov || 60}°
        </span>
        <span className="text-[10px] font-mono text-[var(--chrome-text-400)] bg-black/70 px-2 py-1 rounded uppercase">
          {sensor.classification}
        </span>
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-[var(--chrome-text-300)]">
        <span className="bg-black/70 px-2 py-1 rounded border border-[var(--chrome-border-800)] truncate flex items-center gap-1.5">
          <Icon size={12} className="text-[var(--accent-cyan-soft)]" /> {sensor.name} {sensor.model ? `(${sensor.model})` : ''}
        </span>
        <span className="bg-black/70 px-2 py-1 rounded border border-[var(--chrome-border-800)]">
          {sensor.lat.toFixed(4)}, {sensor.lng.toFixed(4)}
        </span>
      </div>

      {/* Targeting reticle */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-cyan-400/40 rounded pointer-events-none">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/30" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400/30" />
        <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-cyan-400" />
      </div>
    </div>
  );
}

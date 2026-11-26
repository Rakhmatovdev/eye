'use client';
import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import DataBoundary from '../../components/common/DataBoundary';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { militaryApi, sensorsApi, type Unit, type Threat, type Mission, type Sensor } from '../../lib/api';
import { useT } from '../../lib/i18n';
import {
  Crosshair, Shield, Radar, Target, Flag, Users, AlertTriangle, Activity, MapPin, ArrowRight,
} from 'lucide-react';

// Rendered by React as the dynamic-import fallback, so it's a normal function
// component and may use hooks.
function CopMapLoading() {
  const t = useT();
  return (
    <div className="h-full w-full flex items-center justify-center text-[var(--chrome-text-500)] font-mono text-xs bg-[var(--bg-main)]">
      {t('command_map_loading')}
    </div>
  );
}

const CopMap = dynamic(() => import('../../components/map/CopMap'), {
  ssr: false,
  loading: () => <CopMapLoading />,
});

const LEVEL_STYLE: Record<string, string> = {
  critical: 'text-[var(--accent-red-soft)] border-red-500/40 bg-red-500/10',
  high: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  medium: 'text-[var(--accent-amber-soft)] border-amber-500/40 bg-amber-500/10',
  low: 'text-[var(--chrome-text-400)] border-[color-mix(in_srgb,var(--chrome-border-600)_40%,transparent)] bg-[color-mix(in_srgb,var(--chrome-bg-500)_10%,transparent)]',
};
const PRIORITY_STYLE: Record<string, string> = {
  flash: 'text-[var(--accent-red-soft)] border-red-500/40',
  immediate: 'text-orange-400 border-orange-500/40',
  priority: 'text-[var(--accent-amber-soft)] border-amber-500/40',
  routine: 'text-[var(--chrome-text-400)] border-[color-mix(in_srgb,var(--chrome-border-600)_40%,transparent)]',
};
const MISSION_STATUS: Record<string, string> = {
  active: 'text-[var(--accent-emerald-soft)]', planning: 'text-[var(--accent-cyan-soft)]', on_hold: 'text-[var(--accent-amber-soft)]', complete: 'text-[var(--chrome-text-500)]',
};
const LEVEL_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - +new Date(ts)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function CommandPage() {
  const t = useT();
  const [classFilter, setClassFilter] = useState('all');

  const unitsQ = useQuery({ queryKey: ['mil-units'], queryFn: () => militaryApi.units() });
  const threatsQ = useQuery({ queryKey: ['mil-threats'], queryFn: () => militaryApi.threats() });
  const missionsQ = useQuery({ queryKey: ['mil-missions'], queryFn: () => militaryApi.missions() });
  const statsQ = useQuery({ queryKey: ['mil-stats'], queryFn: () => militaryApi.stats() });
  const sensorsQ = useQuery({ queryKey: ['sensors'], queryFn: () => sensorsApi.list() });

  const units: Unit[] = unitsQ.data ?? [];
  const allThreats: Threat[] = threatsQ.data ?? [];
  const missions: Mission[] = missionsQ.data ?? [];
  const sensors: Sensor[] = sensorsQ.data ?? [];
  const stats = statsQ.data;

  const threats = useMemo(() => {
    const f = classFilter === 'all' ? allThreats : allThreats.filter((t) => t.classification === classFilter);
    return [...f].sort((a, b) => (LEVEL_RANK[a.threat_level] ?? 9) - (LEVEL_RANK[b.threat_level] ?? 9));
  }, [allThreats, classFilter]);

  const tiles = [
    { label: t('command_tile_units'), value: stats?.units, color: 'text-[var(--accent-cyan-soft)]', icon: Users },
    { label: t('command_tile_ready'), value: stats?.units_ready, color: 'text-[var(--accent-emerald-soft)]', icon: Shield },
    { label: t('command_tile_threats'), value: stats?.threats, color: 'text-orange-400', icon: Radar },
    { label: t('command_tile_critical'), value: stats?.critical_threats, color: 'text-[var(--accent-red-soft)]', icon: AlertTriangle },
    { label: t('command_tile_active_ops'), value: stats?.active_missions, color: 'text-[var(--accent-violet-soft)]', icon: Flag },
  ];

  return (
    <WorkspaceLayout>
      <DataBoundary queries={[unitsQ, threatsQ, missionsQ, statsQ, sensorsQ]}>
      <div className="h-full flex flex-col">
        {/* Header + tiles */}
        <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-lg font-bold font-mono tracking-wide text-[var(--chrome-text-white)] uppercase flex items-center gap-2">
                <Crosshair size={18} className="text-[var(--accent-cyan-soft)]" /> {t('command_title')}
              </h1>
              <p className="text-[var(--chrome-text-500)] text-xs font-mono mt-0.5">
                {t('command_subtitle')}
              </p>
            </div>
            
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <div key={tile.label} className="bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_70%,transparent)] rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xxs font-mono text-[var(--chrome-text-500)] uppercase tracking-wider">{tile.label}</span>
                    <Icon size={13} />
                  </div>
                  <div className={`text-2xl font-bold font-mono mt-1 ${tile.color}`}>{tile.value}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Map + side panels */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3">
          {/* Tactical map */}
          <div className="lg:col-span-2 relative min-h-[320px] border-r border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)]">
            <CopMap units={units} threats={threats} sensors={sensors} />
            {/* legend */}
            <div className="absolute bottom-3 left-3 z-[500] bg-black/70 border border-[var(--chrome-border-800)] rounded-xl px-3 py-2 text-[10px] font-mono space-y-1">
              <div className="flex items-center gap-2 text-[var(--accent-cyan-soft)]"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> {t('command_legend_friendly')}</div>
              <div className="flex items-center gap-2 text-[var(--accent-red-soft)]"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> {t('command_legend_hostile')}</div>
              <div className="flex items-center gap-2 text-[var(--accent-amber-soft)]"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> {t('command_legend_suspect')}</div>
              <div className="flex items-center gap-2 text-yellow-400"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> {t('command_legend_unknown')}</div>
              <div className="flex items-center gap-2 text-cyan-400"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block border border-cyan-200" /> Sensor / Kamera FOV</div>
            </div>
          </div>

          {/* Right: threats + missions */}
          <div className="min-h-0 overflow-y-auto bg-[var(--bg-elevated)]">
            {/* Threats */}
            <div className="p-4 border-b border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--chrome-text-300)] flex items-center gap-2">
                  <Target size={14} className="text-[var(--accent-red-soft)]" /> {t('command_threat_board_title')}
                </h2>
                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-lg px-2 py-1 text-[10px] text-[var(--chrome-text-300)] focus:outline-none font-mono capitalize">
                  <option value="all">{t('command_filter_all')}</option>
                  <option value="hostile">{t('command_filter_hostile')}</option>
                  <option value="suspect">{t('command_filter_suspect')}</option>
                  <option value="unknown">{t('command_filter_unknown')}</option>
                </select>
              </div>
              <div className="space-y-2">
                {threats.map((th) => (
                  <div key={th.id} className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_50%,transparent)] rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono text-[var(--chrome-text-200)] truncate">{th.designation}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 uppercase ${LEVEL_STYLE[th.threat_level]}`}>
                        {th.threat_level}
                      </span>
                    </div>
                    <div className="text-xxs font-mono text-[var(--chrome-text-500)] mt-1 flex items-center justify-between">
                      <span>{th.type} · {th.speed} {t('command_speed_unit')} · {t('command_heading_label')} {th.heading}°</span>
                      <span>{timeAgo(th.last_seen)} {t('command_ago_suffix')}</span>
                    </div>
                    {th.entity_id && (
                      <Link href={`/entity/${th.entity_id}`} className="text-[10px] font-mono text-[var(--accent-cyan-soft)] hover:underline flex items-center gap-1 mt-1.5">
                        {t('command_linked_intel_prefix')} {th.entity_id} <ArrowRight size={10} />
                      </Link>
                    )}
                  </div>
                ))}
                {threats.length === 0 && <p className="text-xs text-[var(--chrome-text-600)] font-mono py-4 text-center">{t('command_no_tracks')}</p>}
              </div>
            </div>

            {/* Missions */}
            <div className="p-4">
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--chrome-text-300)] flex items-center gap-2 mb-2">
                <Flag size={14} className="text-[var(--accent-violet-soft)]" /> {t('command_ops_board_title')}
              </h2>
              <div className="space-y-2">
                {missions.map((m) => (
                  <div key={m.id} className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_50%,transparent)] rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono text-[var(--chrome-text-200)] truncate">{m.name}</span>
                      <span className={`text-[9px] font-mono uppercase ${MISSION_STATUS[m.status]}`}>{m.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xxs font-mono text-[var(--chrome-text-500)] mt-1 leading-relaxed">{m.objective}</p>
                    <div className="flex items-center gap-2 mt-2 text-xxs font-mono text-[var(--chrome-text-600)]">
                      <span className={`px-1.5 py-0.5 rounded border uppercase ${PRIORITY_STYLE[m.priority]}`}>{m.priority}</span>
                      <span className="flex items-center gap-1"><MapPin size={10} /> {m.area}</span>
                    </div>
                    {/* progress */}
                    <div className="mt-2 h-1.5 bg-[var(--chrome-bg-800)] rounded-full overflow-hidden">
                      <div className={`h-full ${m.status === 'complete' ? 'bg-[var(--chrome-bg-500)]' : 'bg-cyan-500'}`} style={{ width: `${m.progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-[var(--chrome-text-600)]">
                      <span className="flex items-center gap-1"><Activity size={9} /> {m.progress}%</span>
                      <span>{m.assigned_units.join(', ')}</span>
                    </div>
                  </div>
                ))}
                {missions.length === 0 && <p className="text-xs text-[var(--chrome-text-600)] font-mono py-4 text-center">{t('command_no_operations')}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DataBoundary>
    </WorkspaceLayout>
  );
}

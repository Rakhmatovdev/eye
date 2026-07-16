'use client';
import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { militaryApi, type Unit, type Threat, type Mission } from '../../lib/api';
import { mockUnits, mockThreats, mockMissions, mockMilitaryStats } from '../../data/mockMilitary';
import {
  Crosshair, Shield, Radar, Target, Flag, Users, AlertTriangle, Activity, MapPin, ArrowRight,
} from 'lucide-react';

const CopMap = dynamic(() => import('../../components/map/CopMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-gray-500 font-mono text-xs bg-[#07090F]">
      Rendering common operating picture…
    </div>
  ),
});

const LEVEL_STYLE: Record<string, string> = {
  critical: 'text-red-400 border-red-500/40 bg-red-500/10',
  high: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  medium: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  low: 'text-gray-400 border-gray-600/40 bg-gray-500/10',
};
const PRIORITY_STYLE: Record<string, string> = {
  flash: 'text-red-400 border-red-500/40',
  immediate: 'text-orange-400 border-orange-500/40',
  priority: 'text-amber-400 border-amber-500/40',
  routine: 'text-gray-400 border-gray-600/40',
};
const MISSION_STATUS: Record<string, string> = {
  active: 'text-emerald-400', planning: 'text-cyan-400', on_hold: 'text-amber-400', complete: 'text-gray-500',
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
  const [classFilter, setClassFilter] = useState('all');

  const unitsQ = useQuery({ queryKey: ['mil-units'], queryFn: () => militaryApi.units() });
  const threatsQ = useQuery({ queryKey: ['mil-threats'], queryFn: () => militaryApi.threats() });
  const missionsQ = useQuery({ queryKey: ['mil-missions'], queryFn: () => militaryApi.missions() });
  const statsQ = useQuery({ queryKey: ['mil-stats'], queryFn: () => militaryApi.stats() });

  const units: Unit[] = unitsQ.isError ? mockUnits : unitsQ.data ?? [];
  const allThreats: Threat[] = threatsQ.isError ? mockThreats : threatsQ.data ?? [];
  const missions: Mission[] = missionsQ.isError ? mockMissions : missionsQ.data ?? [];
  const stats = statsQ.isError ? mockMilitaryStats : statsQ.data ?? mockMilitaryStats;
  const offline = unitsQ.isError || threatsQ.isError;

  const threats = useMemo(() => {
    const f = classFilter === 'all' ? allThreats : allThreats.filter((t) => t.classification === classFilter);
    return [...f].sort((a, b) => (LEVEL_RANK[a.threat_level] ?? 9) - (LEVEL_RANK[b.threat_level] ?? 9));
  }, [allThreats, classFilter]);

  const tiles = [
    { label: 'Units', value: stats.units, color: 'text-cyan-400', icon: Users },
    { label: 'Ready', value: stats.units_ready, color: 'text-emerald-400', icon: Shield },
    { label: 'Threats', value: stats.threats, color: 'text-orange-400', icon: Radar },
    { label: 'Critical', value: stats.critical_threats, color: 'text-red-400', icon: AlertTriangle },
    { label: 'Active Ops', value: stats.active_missions, color: 'text-violet-400', icon: Flag },
  ];

  return (
    <WorkspaceLayout>
      <div className="h-full flex flex-col">
        {/* Header + tiles */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-800/60 bg-[#0c0e17]/60 space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-lg font-bold font-mono tracking-wide text-white uppercase flex items-center gap-2">
                <Crosshair size={18} className="text-cyan-400" /> Command Post — COP
              </h1>
              <p className="text-gray-500 text-xs font-mono mt-0.5">
                Common Operating Picture · friendly units, threat tracks and the operations board.
              </p>
            </div>
            {offline && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-mono">
                DEMO DATA (API offline)
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.label} className="bg-[#0e1220]/70 border border-gray-800/70 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xxs font-mono text-gray-500 uppercase tracking-wider">{t.label}</span>
                    <Icon size={13} />
                  </div>
                  <div className={`text-2xl font-bold font-mono mt-1 ${t.color}`}>{t.value}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Map + side panels */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3">
          {/* Tactical map */}
          <div className="lg:col-span-2 relative min-h-[320px] border-r border-gray-800/60">
            <CopMap units={units} threats={threats} />
            {/* legend */}
            <div className="absolute bottom-3 left-3 z-[500] bg-black/70 border border-gray-800 rounded-xl px-3 py-2 text-[10px] font-mono space-y-1">
              <div className="flex items-center gap-2 text-cyan-400"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> Friendly</div>
              <div className="flex items-center gap-2 text-red-400"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Hostile</div>
              <div className="flex items-center gap-2 text-amber-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Suspect</div>
              <div className="flex items-center gap-2 text-yellow-400"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> Unknown</div>
            </div>
          </div>

          {/* Right: threats + missions */}
          <div className="min-h-0 overflow-y-auto bg-[#0a0c14]">
            {/* Threats */}
            <div className="p-4 border-b border-gray-800/60">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-300 flex items-center gap-2">
                  <Target size={14} className="text-red-400" /> Threat Board
                </h2>
                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-[10px] text-gray-300 focus:outline-none font-mono capitalize">
                  <option value="all">all</option>
                  <option value="hostile">hostile</option>
                  <option value="suspect">suspect</option>
                  <option value="unknown">unknown</option>
                </select>
              </div>
              <div className="space-y-2">
                {threats.map((t) => (
                  <div key={t.id} className="bg-[#0e1220]/60 border border-gray-800/50 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono text-gray-200 truncate">{t.designation}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 uppercase ${LEVEL_STYLE[t.threat_level]}`}>
                        {t.threat_level}
                      </span>
                    </div>
                    <div className="text-xxs font-mono text-gray-500 mt-1 flex items-center justify-between">
                      <span>{t.type} · {t.speed} km/h · hdg {t.heading}°</span>
                      <span>{timeAgo(t.last_seen)} ago</span>
                    </div>
                    {t.entity_id && (
                      <Link href={`/entity/${t.entity_id}`} className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1 mt-1.5">
                        linked intel: {t.entity_id} <ArrowRight size={10} />
                      </Link>
                    )}
                  </div>
                ))}
                {threats.length === 0 && <p className="text-xs text-gray-600 font-mono py-4 text-center">No tracks.</p>}
              </div>
            </div>

            {/* Missions */}
            <div className="p-4">
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-300 flex items-center gap-2 mb-2">
                <Flag size={14} className="text-violet-400" /> Operations Board
              </h2>
              <div className="space-y-2">
                {missions.map((m) => (
                  <div key={m.id} className="bg-[#0e1220]/60 border border-gray-800/50 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono text-gray-200 truncate">{m.name}</span>
                      <span className={`text-[9px] font-mono uppercase ${MISSION_STATUS[m.status]}`}>{m.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xxs font-mono text-gray-500 mt-1 leading-relaxed">{m.objective}</p>
                    <div className="flex items-center gap-2 mt-2 text-xxs font-mono text-gray-600">
                      <span className={`px-1.5 py-0.5 rounded border uppercase ${PRIORITY_STYLE[m.priority]}`}>{m.priority}</span>
                      <span className="flex items-center gap-1"><MapPin size={10} /> {m.area}</span>
                    </div>
                    {/* progress */}
                    <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${m.status === 'complete' ? 'bg-gray-500' : 'bg-cyan-500'}`} style={{ width: `${m.progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-gray-600">
                      <span className="flex items-center gap-1"><Activity size={9} /> {m.progress}%</span>
                      <span>{m.assigned_units.join(', ')}</span>
                    </div>
                  </div>
                ))}
                {missions.length === 0 && <p className="text-xs text-gray-600 font-mono py-4 text-center">No operations.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}

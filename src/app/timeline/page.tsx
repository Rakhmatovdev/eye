'use client';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { mockEvents, type TimelineEvent } from '../../data/mockEvents';
import { timelineApi } from '../../lib/api';
import { Clock, MapPin, Filter, AlertCircle, Plane, DollarSign, Radio, Users, Milestone, Package, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Per-event-type accent + icon, so the timeline reads at a glance.
const TYPE_META: Record<string, { color: string; icon: LucideIcon }> = {
  travel: { color: 'cyan', icon: Plane },
  financial: { color: 'emerald', icon: DollarSign },
  telecom: { color: 'violet', icon: Radio },
  meeting: { color: 'amber', icon: Users },
  border: { color: 'rose', icon: Milestone },
  cargo: { color: 'blue', icon: Package },
  note: { color: 'gray', icon: FileText },
};

const ACCENT: Record<string, string> = {
  cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  violet: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  rose: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  gray: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

function fmt(ts: string): { date: string; time: string } {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function TimelinePage() {
  const [typeFilter, setTypeFilter] = useState('all');

  const { data, isError } = useQuery({
    queryKey: ['timeline'],
    queryFn: () => timelineApi.list(),
  });

  const usingFallback = isError;
  const source: TimelineEvent[] = usingFallback ? mockEvents : data ?? [];

  // Newest first for display.
  const events = useMemo(() => {
    const filtered = typeFilter === 'all' ? source : source.filter((e) => e.type === typeFilter);
    return [...filtered].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }, [source, typeFilter]);

  const types = useMemo(() => Array.from(new Set(source.map((e) => e.type))).sort(), [source]);

  return (
    <WorkspaceLayout>
      <div className="p-8 space-y-6 h-full overflow-y-auto max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-wide text-white uppercase flex items-center gap-2">
              <Clock size={18} className="text-cyan-400" /> Time Analysis
            </h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">
              Chronological reconstruction of correlated events across monitored entities.
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-3 items-center bg-[#0c0e17]/40 p-4 border border-gray-800/60 rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-500 uppercase tracking-wider">
            <Filter size={14} /> <span>Event type</span>
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
          <span className="text-[10px] font-mono text-gray-600 ml-auto flex items-center gap-2">
            {usingFallback && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                DEMO DATA (API offline)
              </span>
            )}
            {events.length} events
          </span>
        </div>

        {/* Timeline rail */}
        <div className="relative pl-8">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-cyan-500/40 via-gray-800 to-transparent" />
          {events.map((ev) => {
            const meta = TYPE_META[ev.type] || TYPE_META.note;
            const Icon = meta.icon;
            const accent = ACCENT[meta.color] || ACCENT.gray;
            const { date, time } = fmt(ev.timestamp);
            return (
              <div key={ev.id} className="relative mb-5 group">
                <span className={`absolute -left-[29px] top-1 w-6 h-6 rounded-full border flex items-center justify-center ${accent}`}>
                  <Icon size={12} />
                </span>
                <div className="bg-[#0e1220]/60 border border-gray-800/60 rounded-2xl p-4 hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${accent}`}>
                      {ev.type}
                    </span>
                    <span className="text-xxs font-mono text-gray-500">{date} · {time}</span>
                  </div>
                  <h3 className="font-bold text-sm text-gray-200 group-hover:text-cyan-400 transition-colors font-mono mt-2">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{ev.description}</p>
                  <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-800/40 text-xxs font-mono text-gray-500">
                    {ev.location && (
                      <span className="flex items-center gap-1"><MapPin size={11} /> {ev.location}</span>
                    )}
                    {ev.entity_id && <span className="text-gray-600">entity: {ev.entity_id}</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {events.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500 gap-2 font-mono">
              <AlertCircle size={28} />
              <p className="text-xs">No events recorded for this filter.</p>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

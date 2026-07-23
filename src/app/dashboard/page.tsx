'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useT } from '../../lib/i18n';
import { useHasMounted } from '../../lib/useHasMounted';
import { patternsApi } from '../../lib/api';
import { mockPatterns } from '../../data/mockPatterns';
import { PATTERN_TYPE_KEY, PATTERN_TYPE_ICON, PATTERN_FALLBACK_ICON, scoreColorClass } from '../../lib/patternUi';
import {
  FolderOpen,
  MapPin,
  Network,
  Clock,
  ShieldCheck,
  Search,
  MessageSquareCode,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function AnalystDashboard() {
  const t = useT();
  const user = useAuthStore(state => state.user);
  const activeCaseId = useWorkspaceStore(state => state.activeCaseId);
  // `user` is seeded synchronously from localStorage on the client (see
  // authStore.ts's loadInitial()), so the server always renders the "no
  // user yet" defaults below while the client's very first (pre-hydration)
  // render already has the real values — a text-content hydration mismatch.
  // Gate on mount so both renders agree until a normal post-mount re-render.
  const hasMounted = useHasMounted();
  const displayUser = hasMounted ? user : null;

  const stats = [
    { name: t('dashboard_stat_cases_label'), value: t('dashboard_stat_cases_value'), icon: FolderOpen, desc: t('dashboard_stat_cases_desc') },
    { name: t('dashboard_stat_geo_label'), value: t('dashboard_stat_geo_value'), icon: MapPin, desc: t('dashboard_stat_geo_desc') },
    { name: t('dashboard_stat_links_label'), value: t('dashboard_stat_links_value'), icon: Network, desc: t('dashboard_stat_links_desc') },
  ];

  const patternsQ = useQuery({ queryKey: ['patterns'], queryFn: () => patternsApi.list() });
  const patternsUsingFallback = patternsQ.isError;
  const topPatterns = (patternsUsingFallback ? mockPatterns : patternsQ.data ?? [])
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const recentActivities = [
    { id: '1', msg: 'Correlated new phone number +998901234567 to Alisher Karimov', time: '12m ago', type: 'correlation' },
    { id: '2', msg: 'Added "Tashkent Border Registry" source to Case #4', time: '1h ago', type: 'source' },
    { id: '3', msg: 'Resolved path finding query between Silk Road Trading & Zhang Wei', time: '3h ago', type: 'query' },
  ];

  return (
    <WorkspaceLayout>
      <div className="p-8 space-y-6 h-full overflow-y-auto max-w-6xl mx-auto">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-br from-[#0e1220] to-[#0c0e18] border border-gray-800/80 rounded-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="space-y-1">
            <h1 className="text-xl font-bold font-mono tracking-wide text-white">
              {t('dashboard_welcome')} {displayUser?.name.split(' ')[0] || 'John'}
            </h1>
            <p className="text-gray-400 text-xs font-mono">
              {t('dashboard_sandbox_status')} {displayUser?.clearance || 'SECRET'}
            </p>
          </div>
          <Link
            href="/search"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-2 shadow-lg shadow-cyan-500/10"
          >
            <Search size={14} />
            <span>{t('dashboard_search_registry')}</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="bg-[#0e1220]/60 border border-gray-800/60 p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xxs font-bold text-gray-500 uppercase tracking-widest font-mono">{stat.name}</span>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/5 text-cyan-400 flex items-center justify-center border border-cyan-500/10">
                    <Icon size={16} />
                  </div>
                </div>
                <h3 className="text-xl font-bold font-mono text-white">{stat.value}</h3>
                <p className="text-[10px] text-gray-500 font-mono">{stat.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Main Grid: Activity & Cases */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Case Files */}
          <div className="bg-[#0e1220]/40 border border-gray-800/60 p-6 rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-white tracking-wide uppercase">{t('dashboard_active_cases_title')}</h3>
              <p className="text-xxs text-gray-500 font-mono mt-0.5">{t('dashboard_active_cases_subtitle')}</p>
            </div>
            
            <div className="space-y-3">
              {[
                { code: 'CASE-01', title: 'Silk Road Customs Discrepancy', priority: 'High', status: 'In Progress' },
                { code: 'CASE-02', title: 'Almaty Telecom Cell towers', priority: 'Medium', status: 'Reviewing' },
                { code: 'CASE-03', title: 'Tashkent Shell Companies Registry', priority: 'Critical', status: 'Urgent' },
              ].map(c => (
                <Link
                  key={c.code}
                  href={`/graph/${c.code}`}
                  className="flex items-center justify-between p-4 bg-[#0a0c14] border border-gray-800/50 hover:border-cyan-500/30 rounded-xl transition-all block group"
                >
                  <div className="space-y-1">
                    <span className="text-xxs font-bold font-mono text-cyan-400 group-hover:underline">{c.code}</span>
                    <h5 className="text-xs font-bold font-mono text-gray-200 leading-snug">{c.title}</h5>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    c.priority === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    c.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  }`}>
                    {c.priority === 'Critical' ? t('dashboard_priority_critical') :
                      c.priority === 'High' ? t('dashboard_priority_high') :
                      t('dashboard_priority_medium')}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="bg-[#0e1220]/40 border border-gray-800/60 p-6 rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-white tracking-wide uppercase">{t('dashboard_activity_title')}</h3>
              <p className="text-xxs text-gray-500 font-mono mt-0.5">{t('dashboard_activity_subtitle')}</p>
            </div>

            <div className="space-y-4">
              {recentActivities.map(act => (
                <div key={act.id} className="flex gap-3 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0">
                    <MessageSquareCode size={12} className="text-gray-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-gray-300 leading-normal">{act.msg}</p>
                    <span className="text-[10px] text-gray-600 font-mono">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Patterns */}
        <div className="bg-[#0e1220]/40 border border-gray-800/60 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold font-mono text-white tracking-wide uppercase flex items-center gap-2">
                <Sparkles size={14} className="text-cyan-400" /> {t('patterns_dashboard_card_title')}
              </h3>
              <p className="text-xxs text-gray-500 font-mono mt-0.5">{t('patterns_subtitle')}</p>
            </div>
            <Link href="/patterns" className="flex items-center gap-1 text-xxs font-mono text-cyan-400 hover:underline shrink-0">
              {t('patterns_view_all')} <ArrowRight size={11} />
            </Link>
          </div>

          <div className="space-y-2">
            {topPatterns.map((p) => {
              const Icon = PATTERN_TYPE_ICON[p.type] || PATTERN_FALLBACK_ICON;
              return (
                <Link
                  key={p.id}
                  href="/patterns"
                  className="flex items-center gap-3 p-3 bg-[#0a0c14] border border-gray-800/50 hover:border-cyan-500/30 rounded-xl transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-cyan-400">{t(PATTERN_TYPE_KEY[p.type] ?? 'patterns_type_hub_entity')}</span>
                    <h5 className="text-xs font-bold font-mono text-gray-200 truncate">{p.title}</h5>
                  </div>
                  <span className={`text-lg font-bold font-mono shrink-0 ${scoreColorClass(p.score)}`}>{p.score}</span>
                </Link>
              );
            })}
            {topPatterns.length === 0 && (
              <p className="text-xxs text-gray-600 font-mono text-center py-4">{t('patterns_no_patterns')}</p>
            )}
          </div>
        </div>

      </div>
    </WorkspaceLayout>
  );
}

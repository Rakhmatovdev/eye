'use client';
import React from 'react';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { 
  FolderOpen, 
  MapPin, 
  Network, 
  Clock, 
  ShieldCheck, 
  Search,
  MessageSquareCode
} from 'lucide-react';
import Link from 'next/link';

export default function AnalystDashboard() {
  const user = useAuthStore(state => state.user);
  const activeCaseId = useWorkspaceStore(state => state.activeCaseId);

  const stats = [
    { name: 'Investigation Files', value: '4 Active', icon: FolderOpen, desc: 'Open intelligence cases' },
    { name: 'Geospatial Points', value: '1,248 Map Pins', icon: MapPin, desc: 'Correlated geo coordinates' },
    { name: 'Ontology Links', value: '2.4K Mapped Nodes', icon: Network, desc: 'Identified entity edges' },
  ];

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
              Welcome back, Analyst {user?.name.split(' ')[0] || 'John'}
            </h1>
            <p className="text-gray-400 text-xs font-mono">
              Secure sandbox active. Clearance Level: {user?.clearance || 'SECRET'}
            </p>
          </div>
          <Link
            href="/search"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-2 shadow-lg shadow-cyan-500/10"
          >
            <Search size={14} />
            <span>Search Registry</span>
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
              <h3 className="text-sm font-bold font-mono text-white tracking-wide uppercase">Active Cases</h3>
              <p className="text-xxs text-gray-500 font-mono mt-0.5">Assigned files requiring active correlation.</p>
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
                    {c.priority}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="bg-[#0e1220]/40 border border-gray-800/60 p-6 rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-white tracking-wide uppercase">Live activity feed</h3>
              <p className="text-xxs text-gray-500 font-mono mt-0.5">Recent entity mappings across cases.</p>
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

      </div>
    </WorkspaceLayout>
  );
}

'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { casesApi } from '../../lib/api';
import { mockCases, type Case } from '../../data/mockCases';
import { FolderLock, Share2, User, Boxes, AlertCircle } from 'lucide-react';

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'text-red-400 border-red-500/40 bg-red-500/10',
  high: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  medium: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  low: 'text-gray-400 border-gray-600/40 bg-gray-500/10',
};
const STATUS_STYLE: Record<string, string> = {
  'open': 'text-cyan-400',
  'in-progress': 'text-emerald-400',
  'closed': 'text-gray-500',
  'archived': 'text-gray-600',
};

export default function CasesPage() {
  const { data, isError } = useQuery({ queryKey: ['cases'], queryFn: () => casesApi.list() });
  const usingFallback = isError;
  const cases: Case[] = usingFallback ? mockCases : data ?? [];

  return (
    <WorkspaceLayout>
      <div className="p-8 space-y-6 h-full overflow-y-auto max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-wide text-white uppercase flex items-center gap-2">
              <FolderLock size={18} className="text-cyan-400" /> Case Files
            </h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">
              Investigation folders — grouped entities, ontology links and analytic products.
            </p>
          </div>
          <span className="text-[10px] font-mono text-gray-600 flex items-center gap-2">
            {usingFallback && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                DEMO DATA (API offline)
              </span>
            )}
            {cases.length} cases
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((c) => (
            <div key={c.id} className="bg-[#0e1220]/60 border border-gray-800/60 rounded-2xl p-5 hover:border-cyan-500/30 transition-all flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[9px] font-mono uppercase tracking-widest ${STATUS_STYLE[c.status] || 'text-gray-500'}`}>
                  {c.status}
                </span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${PRIORITY_STYLE[c.priority] || PRIORITY_STYLE.medium}`}>
                  {c.priority}
                </span>
              </div>
              <h3 className="font-bold text-sm text-gray-200 font-mono mt-2">{c.title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed flex-1">{c.description}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800/40 text-xxs font-mono text-gray-500">
                <span className="flex items-center gap-1"><User size={11} /> {c.assignee}</span>
                {c.entityCount > 0 && <span className="flex items-center gap-1"><Boxes size={11} /> {c.entityCount} entities</span>}
                <Link href={`/graph/${c.id}`} className="flex items-center gap-1 text-cyan-400 hover:underline">
                  <Share2 size={11} /> Open graph
                </Link>
              </div>
            </div>
          ))}

          {cases.length === 0 && (
            <div className="col-span-2 py-12 flex flex-col items-center justify-center text-center text-gray-500 gap-2 font-mono">
              <AlertCircle size={28} />
              <p className="text-xs">No case files yet.</p>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

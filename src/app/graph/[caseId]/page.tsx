'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import { casesApi } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { Boxes, X, ChevronRight, ChevronLeft } from 'lucide-react';

const CytoscapeGraph = dynamic(() => import('../../../components/graph/CytoscapeGraph'), {
  ssr: false,
});

export default function GraphAnalysisPage({ params }: { params: { caseId: string } }) {
  const { caseId } = params;
  const t = useT();
  const queryClient = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);

  // GET /cases/:id/entities — the entities grouped into this case. Renders
  // empty/hidden if the endpoint errors (e.g. this caseId isn't a real case,
  // such as the default "case-01" the nav links to) rather than blocking the
  // graph canvas itself.
  const entitiesQ = useQuery({
    queryKey: ['case-entities', caseId],
    queryFn: () => casesApi.entities(caseId),
    retry: false,
  });

  const removeM = useMutation({
    mutationFn: (entityId: string) => casesApi.removeEntity(caseId, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-entities', caseId] });
    },
  });

  const entities = entitiesQ.data ?? [];

  return (
    <WorkspaceLayout>
      <div className="w-full h-full flex flex-col">
        {/* Header Bar */}
        <div className="h-14 border-b border-gray-800 bg-[#0c0e17] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold font-mono tracking-wide text-white uppercase">{t('graph_workspace_title')}</h2>
            <span className="text-xxs font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
              {t('graph_active_case_prefix')} {caseId}
            </span>
          </div>
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/60 text-gray-300 rounded-xl text-xxs font-bold font-mono transition-all"
          >
            <Boxes size={12} /> {t('graph_case_entities_btn')} ({entities.length})
            {panelOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 min-h-0 relative flex">
          <div className="flex-1 min-w-0 relative">
            <CytoscapeGraph />
          </div>

          {panelOpen && (
            <div className="w-72 shrink-0 bg-[#0c0e17] border-l border-gray-800/80 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800/60 flex items-center justify-between">
                <h3 className="text-xxs font-bold font-mono uppercase tracking-widest text-gray-300">{t('graph_case_entities_btn')}</h3>
                <button onClick={() => setPanelOpen(false)} className="text-gray-600 hover:text-gray-300">
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {entitiesQ.isLoading && (
                  <p className="text-xxs text-gray-600 font-mono text-center py-4">{t('common_loading')}</p>
                )}
                {entitiesQ.isError && (
                  <p className="text-xxs text-gray-600 font-mono text-center py-4">
                    {t('graph_no_entity_list')}
                  </p>
                )}
                {!entitiesQ.isLoading && !entitiesQ.isError && entities.length === 0 && (
                  <p className="text-xxs text-gray-600 font-mono text-center py-4">{t('graph_no_entities_linked')}</p>
                )}
                {entities.map((e) => (
                  <div
                    key={e.id}
                    className="bg-[#0e1220]/60 border border-gray-800/50 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xxs font-mono uppercase tracking-widest text-cyan-400">{e.type}</div>
                      <div className="text-xs font-mono text-gray-200 truncate">{e.name}</div>
                    </div>
                    <button
                      onClick={() => removeM.mutate(e.id)}
                      disabled={removeM.isPending}
                      title={t('graph_remove_from_case_title')}
                      className="p-1.5 text-gray-600 hover:text-red-400 disabled:opacity-40 shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

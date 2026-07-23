'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import { casesApi, entitiesApi, graphApi } from '../../../lib/api';
import { mockEntities } from '../../../data/mockEntities';
import { mockGraphStats } from '../../../data/mockGraphStats';
import { useT, type TKey } from '../../../lib/i18n';
import { Boxes, X, ChevronRight, ChevronLeft, Route, Users2, Network, ArrowRight, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const CytoscapeGraph = dynamic(() => import('../../../components/graph/CytoscapeGraph'), {
  ssr: false,
});

type PanelTab = 'entities' | 'pathfinder' | 'stats';
type FinderMode = 'path' | 'neighbors';

export default function GraphAnalysisPage({ params }: { params: { caseId: string } }) {
  const { caseId } = params;
  const t = useT();
  const queryClient = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('entities');

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

  // All entities (not just this case's), used to populate the path finder's
  // id pickers with a searchable datalist.
  const allEntitiesQ = useQuery({ queryKey: ['all-entities-picker'], queryFn: () => entitiesApi.list(), retry: false });
  const pickerEntities = allEntitiesQ.isError ? mockEntities : allEntitiesQ.data ?? [];

  const statsQ = useQuery({
    queryKey: ['graph-stats'],
    queryFn: () => graphApi.stats(),
    enabled: panelOpen && panelTab === 'stats',
  });
  const statsUsingFallback = statsQ.isError;
  const stats = statsUsingFallback ? mockGraphStats : statsQ.data;

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
            <Route size={12} /> {t('graph_tab_pathfinder')}
            {panelOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 min-h-0 relative flex">
          <div className="flex-1 min-w-0 relative">
            <CytoscapeGraph />
          </div>

          {panelOpen && (
            <div className="w-80 shrink-0 bg-[#0c0e17] border-l border-gray-800/80 flex flex-col overflow-hidden">
              <div className="px-3 py-2.5 border-b border-gray-800/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-gray-950/60 border border-gray-800/60 rounded-lg p-0.5">
                  <TabButton active={panelTab === 'entities'} onClick={() => setPanelTab('entities')} icon={Boxes} label={t('graph_tab_entities')} />
                  <TabButton active={panelTab === 'pathfinder'} onClick={() => setPanelTab('pathfinder')} icon={Route} label={t('graph_tab_pathfinder')} />
                  <TabButton active={panelTab === 'stats'} onClick={() => setPanelTab('stats')} icon={Network} label={t('graph_tab_stats')} />
                </div>
                <button onClick={() => setPanelOpen(false)} className="text-gray-600 hover:text-gray-300 shrink-0">
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {panelTab === 'entities' && (
                  <EntitiesTab
                    entities={entities}
                    isLoading={entitiesQ.isLoading}
                    isError={entitiesQ.isError}
                    onRemove={(id) => removeM.mutate(id)}
                    removePending={removeM.isPending}
                    t={t}
                  />
                )}
                {panelTab === 'pathfinder' && (
                  <PathFinderTab pickerEntities={pickerEntities} t={t} />
                )}
                {panelTab === 'stats' && (
                  <StatsTab stats={stats} isLoading={statsQ.isLoading} usingFallback={statsUsingFallback} t={t} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

/* --------------------------------- Tabs ----------------------------------- */

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`px-2 py-1 rounded text-[9px] font-bold font-mono uppercase tracking-wide transition-all flex items-center gap-1 ${
        active ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      <Icon size={11} />
    </button>
  );
}

type TFn = (key: TKey) => string;

function EntitiesTab({
  entities,
  isLoading,
  isError,
  onRemove,
  removePending,
  t,
}: {
  entities: { id: string; type: string; name: string }[];
  isLoading: boolean;
  isError: boolean;
  onRemove: (id: string) => void;
  removePending: boolean;
  t: TFn;
}) {
  return (
    <>
      {isLoading && <p className="text-xxs text-gray-600 font-mono text-center py-4">{t('common_loading')}</p>}
      {isError && <p className="text-xxs text-gray-600 font-mono text-center py-4">{t('graph_no_entity_list')}</p>}
      {!isLoading && !isError && entities.length === 0 && (
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
            onClick={() => onRemove(e.id)}
            disabled={removePending}
            title={t('graph_remove_from_case_title')}
            className="p-1.5 text-gray-600 hover:text-red-400 disabled:opacity-40 shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </>
  );
}

function PathFinderTab({ pickerEntities, t }: { pickerEntities: { id: string; name: string }[]; t: TFn }) {
  const [mode, setMode] = useState<FinderMode>('path');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');

  const pathM = useMutation({ mutationFn: () => graphApi.shortestPath(fromId.trim(), toId.trim()) });
  const neighborsM = useMutation({ mutationFn: () => graphApi.commonNeighbors(aId.trim(), bId.trim()) });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 bg-gray-950/60 border border-gray-800/60 rounded-lg p-0.5">
        <button
          onClick={() => setMode('path')}
          className={`flex-1 px-2 py-1.5 rounded text-[9px] font-bold font-mono uppercase tracking-wide transition-all ${
            mode === 'path' ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {t('graph_mode_shortest_path')}
        </button>
        <button
          onClick={() => setMode('neighbors')}
          className={`flex-1 px-2 py-1.5 rounded text-[9px] font-bold font-mono uppercase tracking-wide transition-all ${
            mode === 'neighbors' ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {t('graph_mode_common_neighbors')}
        </button>
      </div>

      <datalist id="graph-entity-picker">
        {pickerEntities.slice(0, 300).map((e) => (
          <option key={e.id} value={e.id}>{e.name}</option>
        ))}
      </datalist>

      {mode === 'path' ? (
        <div className="space-y-2">
          <div>
            <label className="block text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('graph_from_label')}</label>
            <input
              list="graph-entity-picker"
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              placeholder={t('graph_id_placeholder')}
              className="w-full px-2.5 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-xxs text-gray-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('graph_to_label')}</label>
            <input
              list="graph-entity-picker"
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              placeholder={t('graph_id_placeholder')}
              className="w-full px-2.5 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-xxs text-gray-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <button
            onClick={() => fromId.trim() && toId.trim() && pathM.mutate()}
            disabled={!fromId.trim() || !toId.trim() || pathM.isPending}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xxs font-bold font-mono disabled:opacity-40 transition-all"
          >
            <Route size={12} /> {t('graph_find_path_btn')}
          </button>

          {pathM.isError && <p className="text-xxs text-red-400 font-mono text-center py-2">{t('graph_pathfinder_error')}</p>}
          {pathM.isSuccess && (
            <div className="pt-2 space-y-2">
              {pathM.data.nodes.length === 0 ? (
                <p className="text-xxs text-gray-600 font-mono text-center py-3 flex flex-col items-center gap-1">
                  <AlertCircle size={16} /> {t('graph_no_path_found')}
                </p>
              ) : (
                <>
                  <p className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">{t('graph_path_length_prefix')} {pathM.data.length}</p>
                  <div className="space-y-1.5">
                    {pathM.data.nodes.map((node, i) => {
                      const next = pathM.data.nodes[i + 1];
                      const edge = next
                        ? pathM.data.edges.find(
                            (e) => (e.source === node.id && e.target === next.id) || (e.source === next.id && e.target === node.id)
                          )
                        : undefined;
                      return (
                        <React.Fragment key={node.id}>
                          <Link
                            href={`/entity/${node.id}`}
                            className="block bg-[#0e1220]/60 border border-gray-800/50 hover:border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-xxs font-mono text-gray-200 transition-all"
                          >
                            {node.name} <span className="text-gray-600">({node.id})</span>
                          </Link>
                          {next && (
                            <div className="flex items-center gap-1.5 pl-2 text-[9px] font-mono text-gray-600">
                              <ArrowRight size={10} className="text-cyan-500" /> {edge?.label || edge?.type || ''}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="block text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('graph_entity_a_label')}</label>
            <input
              list="graph-entity-picker"
              value={aId}
              onChange={(e) => setAId(e.target.value)}
              placeholder={t('graph_id_placeholder')}
              className="w-full px-2.5 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-xxs text-gray-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('graph_entity_b_label')}</label>
            <input
              list="graph-entity-picker"
              value={bId}
              onChange={(e) => setBId(e.target.value)}
              placeholder={t('graph_id_placeholder')}
              className="w-full px-2.5 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-xxs text-gray-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <button
            onClick={() => aId.trim() && bId.trim() && neighborsM.mutate()}
            disabled={!aId.trim() || !bId.trim() || neighborsM.isPending}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xxs font-bold font-mono disabled:opacity-40 transition-all"
          >
            <Users2 size={12} /> {t('graph_find_neighbors_btn')}
          </button>

          {neighborsM.isError && <p className="text-xxs text-red-400 font-mono text-center py-2">{t('graph_pathfinder_error')}</p>}
          {neighborsM.isSuccess && (
            <div className="pt-2 space-y-2">
              {neighborsM.data.entities.length === 0 ? (
                <p className="text-xxs text-gray-600 font-mono text-center py-3 flex flex-col items-center gap-1">
                  <AlertCircle size={16} /> {t('graph_no_common_neighbors')}
                </p>
              ) : (
                <>
                  <p className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">{t('graph_common_count_prefix')} {neighborsM.data.count}</p>
                  <div className="space-y-1.5">
                    {neighborsM.data.entities.map((e) => (
                      <Link
                        key={e.id}
                        href={`/entity/${e.id}`}
                        className="block bg-[#0e1220]/60 border border-gray-800/50 hover:border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-xxs font-mono text-gray-200 transition-all"
                      >
                        {e.name} <span className="text-gray-600">({e.id})</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatsTab({
  stats,
  isLoading,
  usingFallback,
  t,
}: {
  stats: { top_connected: { entity_id: string; label: string; type: string; degree: number }[]; total_nodes: number; total_edges: number } | undefined;
  isLoading: boolean;
  usingFallback: boolean;
  t: TFn;
}) {
  return (
    <div className="space-y-3">
      {isLoading && <p className="text-xxs text-gray-600 font-mono text-center py-4">{t('common_loading')}</p>}
      {stats && (
        <>
          <div className="flex items-center gap-3 text-[9px] font-mono text-gray-500 uppercase tracking-wider">
            <span>{stats.total_nodes} {t('graph_stats_nodes')}</span>
            <span>{stats.total_edges} {t('graph_stats_edges')}</span>
            {usingFallback && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 normal-case">
                {t('common_demo_data_badge')}
              </span>
            )}
          </div>
          <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-gray-400">{t('graph_top_connected_title')}</h4>
          <div className="space-y-1.5">
            {stats.top_connected.map((e, i) => (
              <Link
                key={e.entity_id}
                href={`/entity/${e.entity_id}`}
                className="flex items-center justify-between gap-2 bg-[#0e1220]/60 border border-gray-800/50 hover:border-cyan-500/40 rounded-lg px-2.5 py-1.5 transition-all"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-[9px] font-mono text-gray-600 shrink-0">#{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-cyan-400">{e.type}</div>
                    <div className="text-xs font-mono text-gray-200 truncate">{e.label}</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-gray-500 shrink-0">{e.degree} {t('graph_degree_suffix')}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

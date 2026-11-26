'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, MapPin, Users, Compass, AlertCircle, Activity, GitBranch, Sparkles, Route, AlertTriangle } from 'lucide-react';
import { workspaceApi, type CaseWorkspace } from '../../lib/workspaceApi';
import { useT } from '../../lib/i18n';
import { QueryState } from './Shared';

type SubMode = 'co_travel' | 'pattern_of_life' | 'link_intelligence';

export default function CoTravelAnalysis({
  caseId,
}: {
  caseId: string;
  context: CaseWorkspace;
}) {
  const t = useT();
  const [mode, setMode] = useState<SubMode>('co_travel');
  const [maxDist, setMaxDist] = useState(100);
  const [maxTime, setMaxTime] = useState(15);
  const [selectedPairKey, setSelectedPairKey] = useState<string | null>(null);

  const [pathFrom, setPathFrom] = useState('');
  const [pathTo, setPathTo] = useState('');
  const [pathK, setPathK] = useState(3);
  const [pathQuery, setPathQuery] = useState<{ from: string; to: string; k: number } | null>(null);

  const query = useQuery({
    queryKey: ['case-co-travel', caseId, maxDist, maxTime],
    queryFn: () => workspaceApi.coTravel(caseId, { max_distance_meters: maxDist, max_time_minutes: maxTime }),
  });

  const polQuery = useQuery({
    queryKey: ['case-pattern-of-life', caseId],
    queryFn: () => workspaceApi.patternOfLife(caseId),
    enabled: mode === 'pattern_of_life',
  });

  const graphQuery = useQuery({
    queryKey: ['case-graph-analytics', caseId],
    queryFn: () => workspaceApi.graphAnalytics(caseId),
    enabled: mode === 'link_intelligence',
  });

  const kPathsQuery = useQuery({
    queryKey: ['case-k-paths', caseId, pathQuery?.from, pathQuery?.to, pathQuery?.k],
    queryFn: () => workspaceApi.kShortestPaths(caseId, pathQuery!.from, pathQuery!.to, pathQuery!.k),
    enabled: mode === 'link_intelligence' && !!pathQuery?.from && !!pathQuery?.to,
  });

  const pairs = query.data?.pairs || [];
  const selectedPair = pairs.find(p => `${p.entity1_id}:${p.entity2_id}` === selectedPairKey) || pairs[0];

  const handleFindPaths = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathFrom.trim() && pathTo.trim()) {
      setPathQuery({ from: pathFrom.trim(), to: pathTo.trim(), k: pathK });
    }
  };

  return (
    <div className="wb-stack space-y-6" data-case-id={caseId} aria-label={t('wb_co_travel')}>
      <div className="wb-toolbar flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Compass className="text-cyan-400" size={24} />
            4D Spatio-Temporal &amp; Graf Intellekti
          </h2>
          <p className="text-sm text-gray-400">
            Birgalikda harakatlanish (Co-Travel), Pattern of Life anomaliyalari, Link Prediction va K-Shortest Path tahlili
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode('co_travel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              mode === 'co_travel'
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Compass size={14} /> Co-Travel
          </button>
          <button
            type="button"
            onClick={() => setMode('pattern_of_life')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              mode === 'pattern_of_life'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity size={14} /> Pattern of Life
          </button>
          <button
            type="button"
            onClick={() => setMode('link_intelligence')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              mode === 'link_intelligence'
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <GitBranch size={14} /> Link Prediction &amp; K-Path
          </button>
        </div>
      </div>

      {mode === 'co_travel' && (
        <>
          <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-wrap items-center gap-6 text-sm">
            <label className="flex items-center gap-2 text-gray-300">
              <MapPin size={16} className="text-cyan-400" />
              <span>Maksimal Masofa:</span>
              <select
                value={maxDist}
                onChange={(e) => setMaxDist(Number(e.target.value))}
                className="wb-input bg-gray-950 border border-gray-800 rounded px-2.5 py-1 text-sm text-white"
              >
                <option value={25}>25 metr</option>
                <option value={50}>50 metr</option>
                <option value={100}>100 metr</option>
                <option value={250}>250 metr</option>
                <option value={500}>500 metr</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-gray-300">
              <Clock size={16} className="text-amber-400" />
              <span>Maksimal Vaqt Oralig&apos;i:</span>
              <select
                value={maxTime}
                onChange={(e) => setMaxTime(Number(e.target.value))}
                className="wb-input bg-gray-950 border border-gray-800 rounded px-2.5 py-1 text-sm text-white"
              >
                <option value={5}>5 daqiqa</option>
                <option value={15}>15 daqiqa</option>
                <option value={30}>30 daqiqa</option>
                <option value={60}>1 soat</option>
              </select>
            </label>
          </div>

          <QueryState query={query} />

          {query.data && !query.isError && (
            <div className="space-y-4">
              {!pairs.length ? (
                <div className="p-8 text-center rounded-xl bg-gray-900/30 border border-dashed border-gray-800 text-gray-400">
                  <AlertCircle className="mx-auto mb-2 text-gray-500" size={32} />
                  <p>Ko&apos;rsatilgan masofa ({maxDist}m) va vaqt ({maxTime} daq) chegaralarida birgalikda harakatlanish holatlari topilmadi.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-2">
                    <h3 className="font-semibold text-sm text-gray-300 flex items-center gap-1.5">
                      <Users size={16} className="text-cyan-400" />
                      Aniqlangan Juftliklar ({pairs.length})
                    </h3>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {pairs.map((p) => {
                        const key = `${p.entity1_id}:${p.entity2_id}`;
                        const isSelected = selectedPair && `${selectedPair.entity1_id}:${selectedPair.entity2_id}` === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setSelectedPairKey(key)}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                              isSelected
                                ? 'bg-cyan-950/40 border-cyan-500/50 shadow-lg'
                                : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                            }`}
                          >
                            <div className="font-bold text-sm text-gray-200">
                              {p.entity1_label} ↔ {p.entity2_label}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                              <span>{p.encounter_count} ta uchrashuv</span>
                              <span className="font-mono text-cyan-400">~{p.average_distance_meters} m</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-2 p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
                    {selectedPair ? (
                      <>
                        <div className="border-b border-gray-800 pb-3">
                          <h4 className="text-lg font-bold text-gray-200">
                            {selectedPair.entity1_label} va {selectedPair.entity2_label}
                          </h4>
                          <p className="text-xs text-gray-400 mt-1">
                            Jami {selectedPair.encounter_count} marta birgalikda qayd etilgan (o&apos;rtacha masofa: {selectedPair.average_distance_meters} metr).
                          </p>
                        </div>

                        <div className="space-y-3">
                          <h5 className="font-semibold text-xs text-gray-400 uppercase tracking-wider">
                            Uchrashuv Nuqtalari:
                          </h5>
                          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                            {selectedPair.encounters.map((enc, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-gray-200 flex items-center gap-1.5">
                                    <MapPin size={13} className="text-cyan-400" />
                                    {enc.location_name || `${enc.latitude.toFixed(5)}, ${enc.longitude.toFixed(5)}`}
                                  </div>
                                  <div className="text-gray-400 flex items-center gap-2">
                                    <span>{new Date(enc.timestamp_1).toLocaleString()}</span>
                                    <span>•</span>
                                    <span>Farq: {Math.round(enc.time_diff_seconds)} soniya</span>
                                  </div>
                                </div>
                                <div className="text-right font-mono text-cyan-400 font-bold">
                                  {enc.distance_meters} metr
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Juftlikni tanlang.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {mode === 'pattern_of_life' && (
        <div className="space-y-4">
          <QueryState query={polQuery} />
          {polQuery.data && !polQuery.isError && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gray-900/60 border border-gray-800 text-xs">
                <span className="text-gray-300">
                  Profillar soni: <strong className="text-white">{polQuery.data.profiles.length}</strong>
                </span>
                <span className={polQuery.data.total_anomalies > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                  Jami aniqlangan anomaliyalar: {polQuery.data.total_anomalies}
                </span>
              </div>

              {!polQuery.data.profiles.length ? (
                <div className="p-8 text-center rounded-xl bg-gray-900/30 border border-dashed border-gray-800 text-gray-400">
                  <Activity className="mx-auto mb-2 text-gray-500" size={32} />
                  <p>Ushbu ish obyektlari uchun geofazoviy kuzatuv tarixi (sightings) topilmadi.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {polQuery.data.profiles.map((prof) => (
                    <div key={prof.entity_id} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-white">{prof.entity_label}</h4>
                          <p className="text-xs text-gray-400">
                            {prof.entity_type} • Asosiy hudud: {prof.primary_zone}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                            prof.routine_score >= 0.8
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : prof.routine_score >= 0.5
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}>
                            Routine {(prof.routine_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                        <span>Qaydlar: {prof.total_sightings}</span>
                        <span>•</span>
                        <span>Faol soatlar: {prof.active_hours.map(h => `${String(h).padStart(2, '0')}:00`).join(', ')}</span>
                      </div>

                      {prof.anomalies.length > 0 ? (
                        <div className="space-y-1.5 pt-2 border-t border-gray-800">
                          {prof.anomalies.map((an, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-gray-950/70 border border-amber-500/20 text-xs space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-amber-300 flex items-center gap-1">
                                  <AlertTriangle size={12} /> {an.anomaly_type.replace(/_/g, ' ')}
                                </span>
                                <span className="font-mono text-[11px] uppercase text-gray-400">{an.severity}</span>
                              </div>
                              <p className="text-gray-300">{an.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-400/80 pt-1">Odatiy hayot tarzi — anomaliya aniqlanmadi.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {mode === 'link_intelligence' && (
        <div className="space-y-6">
          <QueryState query={graphQuery} />

          {/* Link Prediction */}
          {graphQuery.data && !graphQuery.isError && (
            <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" />
                  Yashirin Aloqalarni Bashorat Qilish (Adamic-Adar &amp; Jaccard)
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  {graphQuery.data.total_nodes} tugun • {graphQuery.data.total_edges} aloqa
                </span>
              </div>

              {!graphQuery.data.predicted_links?.length ? (
                <p className="text-xs text-gray-400">Hozirgi graf tuzilmasida yashirin aloqa nomzodlari topilmadi.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {graphQuery.data.predicted_links.map((pl) => (
                    <div key={`${pl.source_id}-${pl.target_id}`} className="p-3.5 rounded-lg bg-gray-950/70 border border-purple-500/20 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-100">
                          {pl.source_label} ⋯ {pl.target_label}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
                          {(pl.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-gray-400 flex flex-wrap gap-2">
                        <span>Tur: <strong className="text-gray-300">{pl.suggested_relation}</strong></span>
                        <span>•</span>
                        <span>AA: {pl.adamic_adar_score.toFixed(2)}</span>
                        <span>•</span>
                        <span>Jaccard: {pl.jaccard_score.toFixed(2)}</span>
                      </div>
                      <div className="text-gray-400">
                        Umumiy qo&apos;shnilar: <span className="text-cyan-300">{pl.common_neighbors.join(', ')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPathFrom(pl.source_id);
                          setPathTo(pl.target_id);
                          setPathQuery({ from: pl.source_id, to: pl.target_id, k: pathK });
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1"
                      >
                        <Route size={12} /> Muqobil yo&apos;llarni ko&apos;rish
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* K-Shortest Path Finder */}
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4">
            <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
              <Route size={16} className="text-cyan-400" />
              K-Shortest Path (Muqobil Bog&apos;lanish Yo&apos;llari)
            </h3>

            <form onSubmit={handleFindPaths} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <input
                value={pathFrom}
                onChange={(e) => setPathFrom(e.target.value)}
                placeholder="Boshlang'ich Entity ID"
                className="wb-input bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white font-mono"
              />
              <input
                value={pathTo}
                onChange={(e) => setPathTo(e.target.value)}
                placeholder="Maqsad Entity ID"
                className="wb-input bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white font-mono"
              />
              <select
                value={pathK}
                onChange={(e) => setPathK(Number(e.target.value))}
                className="wb-input bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white"
              >
                <option value={2}>Top 2 yo&apos;l</option>
                <option value={3}>Top 3 yo&apos;l</option>
                <option value={5}>Top 5 yo&apos;l</option>
              </select>
              <button
                type="submit"
                disabled={!pathFrom.trim() || !pathTo.trim() || kPathsQuery.isFetching}
                className="dashboard-primary-button px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
              >
                {kPathsQuery.isFetching ? 'Qidirilmoqda…' : "Yo'llarni topish"}
              </button>
            </form>

            {!!graphQuery.data?.top_influencers?.length && (
              <div className="flex flex-wrap gap-1.5 items-center text-[11px] text-gray-400">
                <span>Tez tanlash:</span>
                {graphQuery.data.top_influencers.slice(0, 6).map((inf) => (
                  <button
                    key={inf.entity_id}
                    type="button"
                    onClick={() => {
                      if (!pathFrom) setPathFrom(inf.entity_id);
                      else setPathTo(inf.entity_id);
                    }}
                    className="px-2 py-0.5 rounded bg-gray-950 border border-gray-800 hover:border-cyan-500/40 text-gray-300"
                  >
                    {inf.label}
                  </button>
                ))}
              </div>
            )}

            {kPathsQuery.data && (
              <div className="space-y-2">
                {!kPathsQuery.data.length ? (
                  <p className="text-xs text-gray-400">Ko&apos;rsatilgan tugunlar orasida 6 qadamgacha yo&apos;l topilmadi.</p>
                ) : (
                  kPathsQuery.data.map((kp) => (
                    <div key={kp.rank} className="p-3 rounded-lg bg-gray-950/70 border border-gray-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-gray-400">
                        <span className="font-mono text-cyan-400 font-bold">Yo&apos;l #{kp.rank}</span>
                        <span>{kp.hop_count} qadam (hop)</span>
                      </div>
                      <div className="text-gray-200 flex flex-wrap items-center gap-1.5">
                        {kp.node_labels.map((lbl, idx) => (
                          <React.Fragment key={`${kp.rank}-${idx}`}>
                            <span className="px-2 py-0.5 rounded bg-gray-900 border border-gray-700 font-semibold">{lbl}</span>
                            {idx < kp.edge_types.length && (
                              <span className="text-[11px] font-mono text-purple-300">──[{kp.edge_types[idx]}]──▶</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

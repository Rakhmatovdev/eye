'use client';
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BrainCircuit, Check, Plus, Save, Sparkles, AlertTriangle, Download } from 'lucide-react';
import { triggerDownload } from '../../lib/download';
import {
  workspaceApi,
  type ACHMatrix as ACHMatrixType,
  type ACHHypothesis,
  type ACHEvidence,
  type CaseWorkspace,
} from '../../lib/workspaceApi';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import { QueryState, ErrorMessage } from './Shared';

export default function ACHMatrixComponent({
  caseId,
  context,
}: {
  caseId: string;
  context: CaseWorkspace;
}) {
  const t = useT();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['case-ach', caseId],
    queryFn: () => workspaceApi.ach(caseId),
  });

  const [hypoTitle, setHypoTitle] = useState('');
  const [hypoDesc, setHypoDesc] = useState('');
  const [evLabel, setEvLabel] = useState('');
  const [dirty, setDirty] = useState(false);
  const [localMatrix, setLocalMatrix] = useState<ACHMatrixType | null>(null);
  const [error, setError] = useState('');

  const matrix = localMatrix || query.data?.matrix;
  const analysis = query.data?.analysis;

  const saveMutation = useMutation({
    mutationFn: (data: ACHMatrixType) => workspaceApi.saveACH(caseId, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['case-ach', caseId] });
      setDirty(false);
      setError('');
    },
    onError: (e) => setError(apiErrorMessage(e, t('wb_error'))),
  });

  const addHypothesis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hypoTitle.trim() || !matrix) return;
    const newH: ACHHypothesis = {
      id: `H${(matrix.hypotheses?.length || 0) + 1}`,
      title: hypoTitle.trim(),
      description: hypoDesc.trim(),
      inconsistency_count: 0,
      weighted_inconsistency: 0,
      likelihood_rank: (matrix.hypotheses?.length || 0) + 1,
    };
    const next: ACHMatrixType = {
      ...matrix,
      hypotheses: [...(matrix.hypotheses || []), newH],
    };
    setLocalMatrix(next);
    setDirty(true);
    setHypoTitle('');
    setHypoDesc('');
  };

  const addEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evLabel.trim() || !matrix) return;
    const newE: ACHEvidence = {
      id: `E${(matrix.evidence?.length || 0) + 1}`,
      label: evLabel.trim(),
      credibility: 1.0,
      relevance: 1.0,
      diagnosticity: 0,
    };
    const next: ACHMatrixType = {
      ...matrix,
      evidence: [...(matrix.evidence || []), newE],
    };
    setLocalMatrix(next);
    setDirty(true);
    setEvLabel('');
  };

  const cycleRating = (evId: string, hId: string) => {
    if (!context.can_write || !matrix) return;
    const key = `${evId}:${hId}`;
    const curr = matrix.ratings?.[key] ?? 0;
    // Cycle: 0 -> +1 -> +2 -> -1 -> -2 -> 0
    let nextVal = 0;
    if (curr === 0) nextVal = 1;
    else if (curr === 1) nextVal = 2;
    else if (curr === 2) nextVal = -1;
    else if (curr === -1) nextVal = -2;
    else nextVal = 0;

    const nextRatings = { ...(matrix.ratings || {}), [key]: nextVal };
    const next: ACHMatrixType = { ...matrix, ratings: nextRatings };
    setLocalMatrix(next);
    setDirty(true);
  };

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 2:
        return { text: '++', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
      case 1:
        return { text: '+', class: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' };
      case -1:
        return { text: '-', class: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case -2:
        return { text: '--', class: 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold' };
      default:
        return { text: '0', class: 'bg-gray-800/50 text-gray-400 border-gray-700' };
    }
  };

  return (
    <div className="wb-stack space-y-6">
      <div className="wb-toolbar flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BrainCircuit className="text-cyan-400" size={24} />
            ACH — Raqobatlashuvchi Gipotezalar Tahlili (Richards Heuer Metodi)
          </h2>
          <p className="text-sm text-gray-400">
            Gipotezalarni dalillarning eng kam ziddiyatiga qarab xolisona matematik baholash
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="dashboard-secondary-button flex items-center gap-1.5"
            onClick={async () => {
              try {
                const blob = await workspaceApi.exportACHCsv(caseId);
                triggerDownload(blob, `case-${caseId}-ach.csv`);
              } catch (e) {
                setError(apiErrorMessage(e, t('wb_error')));
              }
            }}
          >
            <Download size={15} /> CSV eksport
          </button>
          {dirty && (
            <button
              className="dashboard-primary-button flex items-center gap-1.5"
              disabled={saveMutation.isPending || !context.can_write}
              onClick={() => localMatrix && saveMutation.mutate(localMatrix)}
            >
              <Save size={16} /> Saqlash va Baholash
            </button>
          )}
        </div>
      </div>

      <ErrorMessage message={error} />
      <QueryState query={query} />

      {matrix && !query.isError && (
        <div className="space-y-6">
          {/* Top hypothesis highlight */}
          {analysis?.most_likely_title && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 flex items-center gap-4">
              <Sparkles className="text-amber-400 shrink-0" size={28} />
              <div>
                <p className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">
                  Matematik jihatdan eng ehtimolli gipoteza (№1 O'rin)
                </p>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {analysis.most_likely_title}
                </h3>
                <p className="text-xs text-gray-300 mt-1">
                  Ushbu gipoteza dalillar bilan eng kam ziddiyatga ega ({analysis.total_inconsistencies} ta umumiy ziddiyat qayd etildi).
                </p>
              </div>
            </div>
          )}

          {/* Form to add Hypothesis and Evidence */}
          {context.can_write && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <form onSubmit={addHypothesis} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
                <h4 className="font-semibold text-sm text-gray-200 flex items-center gap-1.5">
                  <Plus size={16} className="text-cyan-400" /> Yangi Gipoteza Qo'shish
                </h4>
                <input
                  type="text"
                  required
                  placeholder="Gipoteza sarlavhasi (masalan: Tashqi kiberhujum)..."
                  className="wb-input w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm"
                  value={hypoTitle}
                  onChange={(e) => setHypoTitle(e.target.value)}
                />
                <button type="submit" className="dashboard-secondary-button text-xs py-1.5">
                  Gipoteza Kiritish
                </button>
              </form>

              <form onSubmit={addEvidence} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
                <h4 className="font-semibold text-sm text-gray-200 flex items-center gap-1.5">
                  <Plus size={16} className="text-cyan-400" /> Yangi Dalil Matritsaga Qo'shish
                </h4>
                <input
                  type="text"
                  required
                  placeholder="Dalil qisqa mazmuni (masalan: VPN orqali soat 22:00 dagi kirish)..."
                  className="wb-input w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm"
                  value={evLabel}
                  onChange={(e) => setEvLabel(e.target.value)}
                />
                <button type="submit" className="dashboard-secondary-button text-xs py-1.5">
                  Dalil Kiritish
                </button>
              </form>
            </div>
          )}

          {/* ACH Interactive Matrix Table */}
          {(!matrix.hypotheses?.length || !matrix.evidence?.length) ? (
            <div className="p-8 text-center rounded-xl bg-gray-900/40 border border-dashed border-gray-800 text-gray-400">
              <AlertTriangle className="mx-auto mb-2 text-amber-400" size={32} />
              <p>ACH matritsasini hisoblash uchun kamida 2 ta gipoteza va 1 ta dalil kiriting.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-800 rounded-xl bg-gray-950">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/80">
                    <th className="p-3 font-semibold text-gray-300 w-1/3">Dalil (Evidence)</th>
                    <th className="p-3 font-semibold text-gray-400 text-xs w-24">Diagnostiklik</th>
                    {matrix.hypotheses.map((h) => (
                      <th key={h.id} className="p-3 text-center border-l border-gray-800">
                        <div className="font-bold text-gray-200">{h.title}</div>
                        <div className="mt-1 flex items-center justify-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 text-xs rounded font-semibold ${
                              h.likelihood_rank === 1
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            O'rin: #{h.likelihood_rank || '-'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {matrix.evidence.map((ev) => (
                    <tr key={ev.id} className="hover:bg-gray-900/40 transition-colors">
                      <td className="p-3 text-gray-200">
                        <span className="font-mono text-xs text-cyan-400 mr-2">{ev.id}</span>
                        {ev.label}
                      </td>
                      <td className="p-3 text-xs text-gray-400 font-mono">
                        {ev.diagnosticity ? ev.diagnosticity.toFixed(2) : '—'}
                      </td>
                      {matrix.hypotheses.map((h) => {
                        const key = `${ev.id}:${h.id}`;
                        const val = matrix.ratings?.[key] ?? 0;
                        const badge = getRatingLabel(val);
                        return (
                          <td key={h.id} className="p-3 text-center border-l border-gray-800">
                            <button
                              type="button"
                              disabled={!context.can_write}
                              onClick={() => cycleRating(ev.id, h.id)}
                              className={`w-10 h-8 rounded border transition-all text-sm ${badge.class}`}
                              title="Bosish orqali almashtiring: 0, +, ++, -, --"
                            >
                              {badge.text}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Summary Row */}
                  <tr className="bg-gray-900/90 font-semibold border-t-2 border-gray-700">
                    <td className="p-3 text-gray-300">Ziddiyatlar soni (Inconsistency Score)</td>
                    <td className="p-3 text-xs text-gray-500">—</td>
                    {matrix.hypotheses.map((h) => (
                      <td key={h.id} className="p-3 text-center border-l border-gray-800 font-mono text-rose-400">
                        {h.inconsistency_count ?? 0}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-2">
            <span className="font-semibold text-gray-300">Belgilar:</span>
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">++</span> To'liq mos</span>
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">+</span> Mos</span>
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">0</span> Neytral</span>
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">-</span> Zid</span>
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">--</span> Keskin zid</span>
          </div>
        </div>
      )}
    </div>
  );
}


'use client';
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, CheckCircle, XCircle, ShieldAlert, Coins, Scale, Play, Clock, Sparkles } from 'lucide-react';
import {
  workspaceApi,
  type AgentProposal,
  type AgentRunResult,
  type CaseWorkspace,
} from '../../lib/workspaceApi';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import { QueryState, ErrorMessage } from './Shared';

export default function AgentProposals({
  caseId,
  context,
}: {
  caseId: string;
  context: CaseWorkspace;
}) {
  const t = useT();
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [activeRunResult, setActiveRunResult] = useState<AgentRunResult | null>(null);
  const [error, setError] = useState('');

  const proposalsQuery = useQuery({
    queryKey: ['case-ai-proposals', caseId, filterStatus],
    queryFn: () => workspaceApi.listProposals(caseId, filterStatus),
  });

  const runAgentMutation = useMutation({
    mutationFn: (agentType: string) => workspaceApi.runSpecialistAgent(caseId, agentType),
    onSuccess: (data) => {
      setActiveRunResult(data);
      qc.invalidateQueries({ queryKey: ['case-ai-proposals', caseId] });
      setError('');
    },
    onError: (e) => setError(apiErrorMessage(e, t('wb_error'))),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) =>
      workspaceApi.reviewProposal(id, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-ai-proposals', caseId] });
      setError('');
    },
    onError: (e) => setError(apiErrorMessage(e, t('wb_error'))),
  });

  const getAgentIcon = (agent: string) => {
    switch (agent) {
      case 'investigator':
        return <Bot className="text-cyan-400" size={18} />;
      case 'financial':
        return <Coins className="text-amber-400" size={18} />;
      case 'contradiction':
        return <Scale className="text-purple-400" size={18} />;
      default:
        return <Bot className="text-gray-400" size={18} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><CheckCircle size={12} /> Tasdiqlangan</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1"><XCircle size={12} /> Rad etilgan</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><Clock size={12} /> Kutilmoqda</span>;
    }
  };

  return (
    <div className="wb-stack space-y-6">
      <div className="wb-toolbar flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-amber-400" size={24} />
            Sovereign AIP — Avtonom Tahlilchi Agentlar (Human-in-the-Loop)
          </h2>
          <p className="text-sm text-gray-400">
            AI agentlar ish ma'lumotlarini o'rganib harakat takliflarini beradi; inson tasdiqlashi shart
          </p>
        </div>
      </div>

      <ErrorMessage message={error} />

      {/* Agent Launcher Bar */}
      {context.can_write && (
        <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
          <h3 className="font-semibold text-sm text-gray-200">Ixtisoslashgan Agentlarni Ishga Tushirish:</h3>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={runAgentMutation.isPending}
              onClick={() => runAgentMutation.mutate('investigator')}
              className="dashboard-secondary-button flex items-center gap-2 py-2 px-3 text-sm hover:border-cyan-500/40"
            >
              <Bot className="text-cyan-400" size={16} />
              <span>Tergovchi Agent (Investigator)</span>
            </button>
            <button
              disabled={runAgentMutation.isPending}
              onClick={() => runAgentMutation.mutate('financial')}
              className="dashboard-secondary-button flex items-center gap-2 py-2 px-3 text-sm hover:border-amber-500/40"
            >
              <Coins className="text-amber-400" size={16} />
              <span>Moliyaviy Tahlilchi (AML / Tranzaksiyalar)</span>
            </button>
            <button
              disabled={runAgentMutation.isPending}
              onClick={() => runAgentMutation.mutate('contradiction')}
              className="dashboard-secondary-button flex items-center gap-2 py-2 px-3 text-sm hover:border-purple-500/40"
            >
              <Scale className="text-purple-400" size={16} />
              <span>Ziddiyatlar Detektori (Contradiction)</span>
            </button>
          </div>
        </div>
      )}

      {/* Latest Run Results */}
      {activeRunResult && (
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
            {getAgentIcon(activeRunResult.agent)}
            <span>Oxirgi Agent Natijasi: {activeRunResult.summary}</span>
          </div>
          <ul className="list-disc list-inside text-xs text-gray-300 space-y-1 pl-2">
            {activeRunResult.key_findings.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Proposals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-200">
            Tavsiya etilgan harakatlar ({proposalsQuery.data?.length || 0})
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Filtr:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="wb-input px-2 py-1 bg-gray-900 border border-gray-800 rounded text-xs"
            >
              <option value="">Barchasi</option>
              <option value="pending">Kutilayotganlar</option>
              <option value="approved">Tasdiqlanganlar</option>
              <option value="rejected">Rad etilganlar</option>
            </select>
          </div>
        </div>

        <QueryState query={proposalsQuery} />

        {proposalsQuery.data && !proposalsQuery.isError && (
          <div className="space-y-3">
            {!proposalsQuery.data.length ? (
              <div className="p-8 text-center rounded-xl bg-gray-900/30 border border-gray-800 text-gray-400 text-sm">
                Hozircha agent takliflari mavjud emas. Yuqoridagi tugmalar orqali agentlarni ishga tushiring.
              </div>
            ) : (
              proposalsQuery.data.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getAgentIcon(p.agent)}
                      <span className="font-bold text-gray-200 text-sm">
                        {p.target_label || p.target_id}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        ({p.action_type})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-cyan-400 font-semibold">
                        Ishonchlilik: {Math.round(p.confidence * 100)}%
                      </span>
                      {getStatusBadge(p.status)}
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 bg-gray-950/40 p-2.5 rounded-lg border border-gray-800/80">
                    {p.reasoning}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <div className="text-gray-400 flex items-center gap-2">
                      <span>Havolalar:</span>
                      {p.evidence_citations.map((c, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-gray-800 rounded font-mono text-[11px] text-gray-300">
                          {c}
                        </span>
                      ))}
                    </div>

                    {p.status === 'pending' && context.can_write && (
                      <div className="flex items-center gap-2">
                        <button
                          disabled={reviewMutation.isPending}
                          onClick={() => reviewMutation.mutate({ id: p.id, decision: 'approved' })}
                          className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded text-xs font-semibold flex items-center gap-1"
                        >
                          <CheckCircle size={14} /> Tasdiqlash
                        </button>
                        <button
                          disabled={reviewMutation.isPending}
                          onClick={() => reviewMutation.mutate({ id: p.id, decision: 'rejected' })}
                          className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded text-xs font-semibold flex items-center gap-1"
                        >
                          <XCircle size={14} /> Rad etish
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}


'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ReportModal from '../../components/common/ReportModal';
import { casesApi, reportsApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT, type TKey } from '../../lib/i18n';
import { mockCases, type Case } from '../../data/mockCases';
import { FolderLock, Share2, User, Boxes, AlertCircle, Trash2, FileText } from 'lucide-react';

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
const STATUS_OPTIONS = ['open', 'in-progress', 'closed', 'archived'];
const STATUS_KEY: Record<string, TKey> = {
  open: 'cases_status_open',
  'in-progress': 'cases_status_in_progress',
  closed: 'cases_status_closed',
  archived: 'cases_status_archived',
};

export default function CasesPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const { data, isError } = useQuery({ queryKey: ['cases'], queryFn: () => casesApi.list() });
  const usingFallback = isError;
  const cases: Case[] = usingFallback ? mockCases : data ?? [];

  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Case | null>(null);
  const [reportTarget, setReportTarget] = useState<Case | null>(null);

  const reportM = useMutation({ mutationFn: (caseId: string) => reportsApi.case(caseId) });
  const handleOpenReport = (c: Case) => {
    setReportTarget(c);
    reportM.mutate(c.id);
  };

  const statusM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => casesApi.update(id, { status }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (err) => setError(apiErrorMessage(err, t('cases_status_update_error'))),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => casesApi.remove(id),
    onSuccess: () => {
      setError('');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (err) => {
      setError(apiErrorMessage(err, t('cases_delete_error')));
      setDeleteTarget(null);
    },
  });

  return (
    <WorkspaceLayout>
      <div className="p-8 space-y-6 h-full overflow-y-auto max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-wide text-white uppercase flex items-center gap-2">
              <FolderLock size={18} className="text-cyan-400" /> {t('nav_cases')}
            </h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">
              {t('cases_subtitle')}
            </p>
          </div>
          <span className="text-[10px] font-mono text-gray-600 flex items-center gap-2">
            {usingFallback && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                {t('common_demo_data_badge')}
              </span>
            )}
            {cases.length} {t('cases_count_suffix')}
          </span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((c) => (
            <div key={c.id} className="bg-[#0e1220]/60 border border-gray-800/60 rounded-2xl p-5 hover:border-cyan-500/30 transition-all flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <select
                  value={c.status}
                  onChange={(e) => statusM.mutate({ id: c.id, status: e.target.value })}
                  disabled={statusM.isPending}
                  className={`bg-transparent border border-gray-800/60 rounded-lg px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest focus:outline-none ${STATUS_STYLE[c.status] || 'text-gray-500'}`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} className="bg-[#0c0e17] text-gray-200">{t(STATUS_KEY[s])}</option>
                  ))}
                </select>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${PRIORITY_STYLE[c.priority] || PRIORITY_STYLE.medium}`}>
                  {c.priority}
                </span>
              </div>
              <h3 className="font-bold text-sm text-gray-200 font-mono mt-2">{c.title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed flex-1">{c.description}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800/40 text-xxs font-mono text-gray-500">
                <span className="flex items-center gap-1"><User size={11} /> {c.assignee}</span>
                {c.entityCount > 0 && <span className="flex items-center gap-1"><Boxes size={11} /> {c.entityCount} {t('cases_entities_suffix')}</span>}
                <div className="flex items-center gap-3">
                  <Link href={`/graph/${c.id}`} className="flex items-center gap-1 text-cyan-400 hover:underline">
                    <Share2 size={11} /> {t('cases_open_graph_link')}
                  </Link>
                  <button
                    onClick={() => handleOpenReport(c)}
                    className="flex items-center gap-1 text-gray-400 hover:text-gray-200 hover:underline"
                  >
                    <FileText size={11} /> {t('report_btn')}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="flex items-center gap-1 text-red-400 hover:underline"
                  >
                    <Trash2 size={11} /> {t('common_delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {cases.length === 0 && (
            <div className="col-span-2 py-12 flex flex-col items-center justify-center text-center text-gray-500 gap-2 font-mono">
              <AlertCircle size={28} />
              <p className="text-xs">{t('cases_no_cases')}</p>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title={t('cases_delete_title')}
          message={`${t('cases_delete_message_prefix')}${deleteTarget.title}${t('cases_delete_message_suffix')}`}
          isPending={deleteM.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteM.mutate(deleteTarget.id)}
        />
      )}

      {reportTarget && (
        <ReportModal
          title={`${t('report_title')} — ${reportTarget.title}`}
          filename={`${reportTarget.id}-report.md`}
          markdown={reportM.data?.markdown ?? null}
          generatedAt={reportM.data?.generated_at}
          isLoading={reportM.isPending}
          isError={reportM.isError}
          onClose={() => setReportTarget(null)}
        />
      )}
    </WorkspaceLayout>
  );
}

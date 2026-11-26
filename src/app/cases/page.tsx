'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import DataBoundary from '../../components/common/DataBoundary';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ReportModal from '../../components/common/ReportModal';
import AttachmentsModal from '../../components/common/AttachmentsModal';
import { casesApi, reportsApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { triggerDownload } from '../../lib/download';
import { useT, type TKey } from '../../lib/i18n';
import { type Case } from '../../data/mockCases';
import { FolderLock, Share2, User, Boxes, AlertCircle, Trash2, FileText, Download, Paperclip, ClipboardList } from 'lucide-react';

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'text-[var(--accent-red-soft)] border-red-500/40 bg-red-500/10',
  high: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  medium: 'text-[var(--accent-amber-soft)] border-amber-500/40 bg-amber-500/10',
  low: 'text-[var(--chrome-text-400)] border-[color-mix(in_srgb,var(--chrome-border-600)_40%,transparent)] bg-[color-mix(in_srgb,var(--chrome-bg-500)_10%,transparent)]',
};
const STATUS_STYLE: Record<string, string> = {
  'open': 'text-[var(--accent-cyan-soft)]',
  'in-progress': 'text-[var(--accent-emerald-soft)]',
  'closed': 'text-[var(--chrome-text-500)]',
  'archived': 'text-[var(--chrome-text-600)]',
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
  const [page,setPage]=useState(1);
  const sourceQ = useQuery({ queryKey: ['cases','page',page], queryFn: ({signal}) => casesApi.listPaged(page,20,signal) });
  const data=sourceQ.data?.cases;const total=sourceQ.data?.total??0,pages=Math.max(1,Math.ceil(total/20));
  const cases: Case[] = data ?? [];

  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Case | null>(null);
  const [reportTarget, setReportTarget] = useState<Case | null>(null);
  const [attachmentsTarget, setAttachmentsTarget] = useState<Case | null>(null);

  const reportM = useMutation({ mutationFn: (caseId: string) => reportsApi.case(caseId) });
  const handleOpenReport = (c: Case) => {
    setReportTarget(c);
    reportM.mutate(c.id);
  };

  const statusM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => casesApi.update(id, { status, ...(cases.find(c=>c.id===id)?.updated_at?{expected_updated_at:cases.find(c=>c.id===id)?.updated_at}:{}) }),
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

  const exportCsvM = useMutation({
    mutationFn: () => casesApi.exportCsv(),
    onSuccess: (blob) => {
      setError('');
      triggerDownload(blob, 'cases.csv');
    },
    onError: (err) => setError(apiErrorMessage(err, t('export_csv_error'))),
  });

  return (
    <WorkspaceLayout>
      <DataBoundary queries={[sourceQ]}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 h-full overflow-y-auto max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-wide text-[var(--chrome-text-white)] uppercase flex items-center gap-2">
              <FolderLock size={18} className="text-[var(--accent-cyan-soft)]" /> {t('nav_cases')}
            </h1>
            <p className="text-[var(--chrome-text-500)] text-xs font-mono mt-0.5">
              {t('cases_subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-[var(--chrome-text-600)] flex items-center gap-2">

              {cases.length} {t('cases_count_suffix')}
            </span>
            {!sourceQ.isError && (
              <button
                onClick={() => exportCsvM.mutate()}
                disabled={exportCsvM.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] hover:border-cyan-500/50 text-[var(--chrome-text-300)] rounded-xl text-xxs font-bold font-mono disabled:opacity-40 transition-all"
              >
                <Download size={12} /> {t('export_csv_btn')}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-[var(--accent-red-soft)] px-4 py-2.5 rounded-xl text-xs font-semibold font-mono">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((c) => (
            <div key={c.id} className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-2xl p-5 hover:border-cyan-500/30 transition-all flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <select
                  value={c.status}
                  onChange={(e) => statusM.mutate({ id: c.id, status: e.target.value })}
                  disabled={statusM.isPending}
                  className={`bg-transparent border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-lg px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest focus:outline-none ${STATUS_STYLE[c.status] || 'text-[var(--chrome-text-500)]'}`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} className="bg-[var(--bg-card)] text-[var(--chrome-text-200)]">{t(STATUS_KEY[s])}</option>
                  ))}
                </select>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${PRIORITY_STYLE[c.priority] || PRIORITY_STYLE.medium}`}>
                  {c.priority}
                </span>
              </div>
              <h3 className="font-bold text-sm text-[var(--chrome-text-200)] font-mono mt-2">{c.title}</h3>
              <p className="text-xs text-[var(--chrome-text-500)] mt-1 leading-relaxed flex-1">{c.description}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[color-mix(in_srgb,var(--chrome-border-800)_40%,transparent)] text-xxs font-mono text-[var(--chrome-text-500)]">
                <span className="flex items-center gap-1"><User size={11} /> {c.assignee}</span>
                {c.entityCount > 0 && <span className="flex items-center gap-1"><Boxes size={11} /> {c.entityCount} {t('cases_entities_suffix')}</span>}
                <div className="flex items-center gap-3">
                  <Link href={`/graph/${c.id}`} className="flex items-center gap-1 text-[var(--accent-cyan-soft)] hover:underline">
                    <Share2 size={11} /> {t('cases_open_graph_link')}
                  </Link>
                  <button
                    onClick={() => handleOpenReport(c)}
                    className="flex items-center gap-1 text-[var(--chrome-text-400)] hover:text-[var(--chrome-text-200)] hover:underline"
                  >
                    <FileText size={11} /> {t('report_btn')}
                  </button>
                  <button
                    onClick={() => setAttachmentsTarget(c)}
                    className="flex items-center gap-1 text-[var(--chrome-text-400)] hover:text-[var(--chrome-text-200)] hover:underline"
                  >
                    <Paperclip size={11} /> {t('entity_section_attachments')}
                  </button>
                  <Link href={`/workbench?case=${encodeURIComponent(c.id)}&tab=board`} className="flex items-center gap-1 text-[var(--chrome-text-400)] hover:text-[var(--chrome-text-200)] hover:underline">
                    <ClipboardList size={11} /> {t('wb_title')}
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="flex items-center gap-1 text-[var(--accent-red-soft)] hover:underline"
                  >
                    <Trash2 size={11} /> {t('common_delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {cases.length === 0 && (
            <div className="col-span-2 py-12 flex flex-col items-center justify-center text-center text-[var(--chrome-text-500)] gap-2 font-mono">
              <AlertCircle size={28} />
              <p className="text-xs">{t('cases_no_cases')}</p>
            </div>
          )}
        </div>
      </div>

      <nav aria-label={t("pro_page")} className="flex flex-wrap items-center justify-between gap-3"><button className="dashboard-secondary-button" disabled={page<=1||sourceQ.isFetching} onClick={()=>setPage(p=>p-1)}>{t("pro_previous_page")}</button><span>{t("pro_page")} {page} / {pages} · {total}</span><button className="dashboard-secondary-button" disabled={page>=pages||sourceQ.isFetching} onClick={()=>setPage(p=>p+1)}>{t("pro_next_page")}</button></nav>
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
          onDownloadPdf={() => reportsApi.casePdf(reportTarget.id)}
          onDownloadCsv={() => reportsApi.caseCsv(reportTarget.id)}
        />
      )}

      {attachmentsTarget && (
        <AttachmentsModal
          title={`${t('entity_section_attachments')} — ${attachmentsTarget.title}`}
          subjectType="cases"
          subjectId={attachmentsTarget.id}
          onClose={() => setAttachmentsTarget(null)}
        />
      )}
    </DataBoundary>
    </WorkspaceLayout>
  );
}

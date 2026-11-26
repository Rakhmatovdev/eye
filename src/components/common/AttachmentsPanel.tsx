'use client';
import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Upload, Download, Trash2, ShieldCheck, FileSearch, Search } from 'lucide-react';
import { attachmentsApi, type Attachment, type AttachmentSubject, type AttachmentText } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { triggerDownload } from '../../lib/download';
import { useT } from '../../lib/i18n';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentsPanelProps {
  subjectType: AttachmentSubject;
  subjectId: string;
  readOnly?: boolean;
}

// File-attachment UI shared by the entity dossier page (inline section) and
// the case attachments modal — upload, list, download, delete against
// GET/POST /<entities|cases>/:id/attachments (backend: internal/attachments).
export default function AttachmentsPanel({ subjectType, subjectId, readOnly = false }: AttachmentsPanelProps) {
  const t = useT();
  const qc = useQueryClient();
  const queryKey = ['attachments', subjectType, subjectId];

  const { data: attachments = [], isError: listError, isPending: listPending, isFetching: listFetching, refetch } = useQuery({
    queryKey,
    queryFn: () => attachmentsApi.list(subjectType, subjectId),
  });

  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [evidenceSource, setEvidenceSource] = useState('');
  const [collectedAt, setCollectedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [verification, setVerification] = useState<Record<string, string>>({});
  const [selectedText, setSelectedText] = useState<AttachmentText | null>(null);
  const [textQuery, setTextQuery] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey });

  const uploadM = useMutation({
    mutationFn: (f: File) => attachmentsApi.upload(subjectType, subjectId, f, { evidenceSource, collectedAt, notes }),
    onSuccess: () => {
      setError('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setEvidenceSource(''); setCollectedAt(''); setNotes('');
      invalidate();
    },
    onError: (err) => setError(apiErrorMessage(err, t('attachments_upload_failed'))),
  });

  const verifyM = useMutation({
    mutationFn: (id: string) => attachmentsApi.verify(subjectType, subjectId, id),
    onSuccess: (result) => setVerification((old) => ({ ...old, [result.attachment_id]: result.status })),
    onError: (err) => setError(apiErrorMessage(err, t('wb_error'))),
  });
  const textM = useMutation({
    mutationFn: (id: string) => readOnly ? attachmentsApi.text(subjectType, subjectId, id) : attachmentsApi.extractText(subjectType, subjectId, id),
    onSuccess: result => { setError(''); setSelectedText(result); },
    onError: err => setError(apiErrorMessage(err, t('attachments_text_error'))),
  });
  const searchTextM = useMutation({
    mutationFn: (request: { subjectType: AttachmentSubject; subjectId: string; query: string }) =>
      attachmentsApi.searchText(request.subjectType, request.subjectId, request.query),
  });
  const currentSearch = searchTextM.variables?.subjectType === subjectType &&
    searchTextM.variables.subjectId === subjectId && searchTextM.variables.query === textQuery.trim();
  const textHits = currentSearch ? searchTextM.data ?? [] : [];

  const deleteM = useMutation({
    mutationFn: (id: string) => attachmentsApi.remove(subjectType, subjectId, id),
    onSuccess: () => {
      setError('');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) => {
      setError(apiErrorMessage(err, t('attachments_delete_failed')));
      setDeleteTarget(null);
    },
  });

  const handleDownload = async (att: Attachment) => {
    setError('');
    setDownloadingId(att.id);
    try {
      const blob = await attachmentsApi.download(subjectType, subjectId, att.id);
      triggerDownload(blob, att.filename);
    } catch (err) {
      setError(apiErrorMessage(err, t('attachments_download_failed')));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {!readOnly && <><div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 px-3 py-1.5 border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-xl text-xxs font-bold font-mono text-[var(--chrome-text-300)] hover:border-cyan-500/50 cursor-pointer transition-all">
          <Paperclip size={12} />
          {t('attachments_choose_file')}
          <input
            data-testid="attachments-file-input"
            ref={fileInputRef}
            type="file"
            className="hidden"
            disabled={uploadM.isPending}
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] ?? null;
              if (selectedFile && selectedFile.size > MAX_ATTACHMENT_BYTES) {
                e.target.value = '';
                setFile(null);
                setError(t('attachments_size_limit'));
                return;
              }
              setFile(selectedFile);
              setError('');
            }}
          />
        </label>
        <span className="text-xxs font-mono text-[var(--chrome-text-500)] truncate max-w-[160px]">
          {file ? file.name : t('attachments_no_file')}
        </span>
        <button
          data-testid="attachments-upload-btn"
          onClick={() => {
            if (!file) return;
            setError('');
            uploadM.mutate(file);
          }}
          disabled={!file || uploadM.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xxs font-bold font-mono disabled:opacity-40 transition-all"
        >
          <Upload size={12} /> {uploadM.isPending ? t('attachments_uploading') : t('attachments_upload_btn')}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input aria-label={t('attachments_source')} value={evidenceSource} onChange={(e) => setEvidenceSource(e.target.value)} maxLength={200} placeholder={t('attachments_source')} className="min-w-0 rounded-lg border border-[var(--chrome-border-800)] bg-[var(--bg-card)] px-2 py-1.5 text-xxs font-mono text-[var(--chrome-text-300)]" />
        <input type="date" value={collectedAt} onChange={(e) => setCollectedAt(e.target.value)} aria-label={t('attachments_collected_at')} className="min-w-0 rounded-lg border border-[var(--chrome-border-800)] bg-[var(--bg-card)] px-2 py-1.5 text-xxs font-mono text-[var(--chrome-text-300)]" />
        <input aria-label={t('attachments_notes')} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder={t('attachments_notes')} className="min-w-0 rounded-lg border border-[var(--chrome-border-800)] bg-[var(--bg-card)] px-2 py-1.5 text-xxs font-mono text-[var(--chrome-text-300)]" />
      </div>

      </>}
      {error && (
        <div role="alert" className="text-xxs text-[var(--accent-red-soft)] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 font-mono">
          {error}
        </div>
      )}

      {listPending && (
        <p role="status" className="text-xxs text-[var(--chrome-text-500)] font-mono">{t('attachments_loading')}</p>
      )}
      {listError && (
        <div className="flex items-center gap-2 text-xxs text-[var(--chrome-text-500)] font-mono">
          <span role="status">{t('attachments_list_error')}</span>
          <button type="button" className="underline disabled:opacity-40" disabled={listFetching} onClick={() => void refetch()}>
            {t('common_retry')}
          </button>
        </div>
      )}

      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (textQuery.trim() && !(currentSearch && searchTextM.isPending)) searchTextM.mutate({ subjectType, subjectId, query: textQuery.trim() }); }}>
        <input value={textQuery} onChange={e => { setTextQuery(e.target.value); searchTextM.reset(); }} maxLength={200} placeholder={t('attachments_search_text')} className="min-w-0 flex-1 rounded-lg border border-[var(--chrome-border-800)] bg-[var(--bg-card)] px-2 py-1.5 text-xxs" />
        <button disabled={!textQuery.trim() || (currentSearch && searchTextM.isPending)} title={t('attachments_search_text')} className="p-2 rounded-lg border border-[var(--chrome-border-800)] text-[var(--accent-cyan-soft)]"><Search size={13}/></button>
      </form>
      {currentSearch && searchTextM.isPending && <p role="status">{t('attachments_search_pending')}</p>}
      {currentSearch && searchTextM.isError && <p role="alert">{apiErrorMessage(searchTextM.error, t('attachments_search_failed'))}</p>}
      {currentSearch && searchTextM.isSuccess && textHits.length === 0 && <p role="status">{t('attachments_search_empty')}</p>}
      {textHits.length > 0 && <div className="space-y-2">{textHits.map(hit => <button key={hit.attachment_id} className="w-full text-left rounded-lg border border-[var(--chrome-border-800)] p-2 text-xxs" onClick={() => textM.mutate(hit.attachment_id)}><strong>{hit.filename}</strong><span className="block text-[var(--chrome-text-500)] mt-1">{hit.snippet}</span></button>)}</div>}

      {!listPending && !listError && attachments.length === 0 && (
        <p className="text-xxs text-[var(--chrome-text-600)] font-mono">{t('attachments_empty')}</p>
      )}
      {attachments.length > 0 && (
        <div className="space-y-1.5" data-testid="attachments-list">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between gap-2 bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_50%,transparent)] rounded-xl px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-mono text-[var(--chrome-text-200)] truncate">{att.filename}</p>
                <p className="text-xxs font-mono text-[var(--chrome-text-500)]">
                  {formatSize(att.size)} · {t('attachments_uploaded_by_prefix')} {att.uploaded_by.slice(0, 8)} · {new Date(att.created_at).toLocaleString()}
                </p>
                {(att.evidence_source || att.collected_at || att.notes) && <p className="text-xxs font-mono text-[var(--chrome-text-400)]">{[att.evidence_source, att.collected_at && new Date(att.collected_at).toLocaleDateString(), att.notes].filter(Boolean).join(' · ')}</p>}
                {att.sha256 && <p className="text-[9px] font-mono text-[var(--chrome-text-600)] break-all">SHA-256: {att.sha256}</p>}
                {verification[att.id] && <p className="text-xxs font-mono text-[var(--chrome-text-400)]">{t(`attachments_verify_${verification[att.id]}` as 'attachments_verify_valid')}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => textM.mutate(att.id)} disabled={textM.isPending} title={readOnly ? t('attachments_view_text') : t('attachments_extract_text')} className="p-1.5 rounded-lg text-violet-400 hover:bg-violet-500/10"><FileSearch size={13}/></button>
                <button onClick={() => verifyM.mutate(att.id)} disabled={verifyM.isPending} title={t('attachments_verify')} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10"><ShieldCheck size={13} /></button>
                <button
                  data-testid="attachments-download-btn"
                  onClick={() => handleDownload(att)}
                  disabled={downloadingId === att.id}
                  title={t('attachments_download')}
                  className="p-1.5 rounded-lg text-[var(--accent-cyan-soft)] hover:bg-cyan-500/10 disabled:opacity-40"
                >
                  <Download size={13} />
                </button>
                {!readOnly && <button
                  data-testid="attachments-delete-btn"
                  onClick={() => setDeleteTarget(att)}
                  title={t('common_delete')}
                  className="p-1.5 rounded-lg text-[var(--accent-red-soft)] hover:bg-red-500/10"
                >
                  <Trash2 size={13} />
                </button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('common_delete')}
          message={`${t('attachments_delete_confirm_prefix')}${deleteTarget.filename}${t('attachments_delete_confirm_suffix')}`}
          isPending={deleteM.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteM.mutate(deleteTarget.id)}
        />
      )}
      {selectedText && <Modal title={selectedText.filename} onClose={() => setSelectedText(null)}><div className="space-y-3"><p className="text-xxs text-[var(--chrome-text-500)]">{selectedText.extractor} · {new Date(selectedText.extracted_at).toLocaleString()}</p><pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--chrome-border-800)] bg-[var(--bg-main)] p-4 text-xs">{selectedText.text || t('attachments_text_empty')}</pre></div></Modal>}
    </div>
  );
}

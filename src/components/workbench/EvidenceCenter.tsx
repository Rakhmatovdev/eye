'use client';
import {recordAnchor,focusRecord} from './RecordFocus';
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileCheck2, Paperclip, Plus } from 'lucide-react';
import { attachmentsApi } from '../../lib/api';
import { workspaceApi, type CaseWorkspace, type EvidenceInput } from '../../lib/workspaceApi';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import { useAuthStore } from '../../store/authStore';
import AttachmentsPanel from '../common/AttachmentsPanel';
import Modal from '../common/Modal';
import { DateLabel, ErrorMessage, QueryState } from './Shared';
import EvidenceClaims from './EvidenceClaims';
import { useDiagnosticCopy } from './DiagnosticCopy';

export default function EvidenceCenter({ caseId, context }: { caseId: string; context: CaseWorkspace }) {
  const copy = useDiagnosticCopy(); const t = useT(); const user = useAuthStore(s => s.user); const [create, setCreate] = useState(false);
  const query = useQuery({ queryKey: ['case-evidence', caseId, user?.id], queryFn: () => workspaceApi.evidence(caseId) });
  return <div className="wb-stack"><div className="wb-toolbar"><div><h2>{t('wb_evidence')}</h2><p>{t('wb_evidence_note')}</p></div>{context.can_write && <button className="dashboard-primary-button" onClick={() => setCreate(true)}><Plus size={16} />{t('wb_add_evidence')}</button>}</div>
    <div className="wb-evidence-layout"><section><QueryState query={query} empty={!query.data?.length} /><div className="wb-evidence-list">{query.data?.map(e => <article id={recordAnchor("evidence",e.id)} ref={node=>focusRecord(node,"evidence",e.id)} className="wb-evidence-card" key={e.id}><header><FileCheck2 size={19} /><h3>{e.title}</h3><span className={`wb-badge assessment-${e.assessment}`}>{t(`wb_${e.assessment}`)}</span></header><p className="wb-source"><strong>{t('wb_source')}</strong>{e.source}</p><p className="wb-prose">{e.conclusion}</p><div className="wb-evidence-meta"><span>{t('wb_reliability')}: <strong>{t(`wb_${e.reliability}`)}</strong></span><DateLabel value={e.created_at} /></div><>{!!e.claims?.length && <details className="wb-history"><summary>{copy.claims} ({e.claims.length})</summary>{e.claims.map((claim, i) => <div key={i} className="wb-file-ref"><strong>{claim.field}: {claim.value}</strong><code>{claim.entity_id}</code><small>{claim.valid_from?.slice(0, 10) ?? '−∞'} → {claim.valid_to?.slice(0, 10) ?? '+∞'}</small></div>)}</details>}</><EvidenceProvenance caseId={caseId} evidenceId={e.id} author={context.participants.find(p => p.id === e.created_by)?.name ?? e.created_by} classification={e.classification} />{e.files.length > 0 && <details className="wb-history"><summary><Paperclip size={12} /> {t('wb_files')} ({e.files.length})</summary>{e.files.map(f => <div key={f.id} className="wb-file-ref"><strong>{f.filename}</strong><code>SHA-256: {f.sha256 || '—'}</code></div>)}</details>}</article>)}</div></section>
    <aside className="wb-file-panel"><h3><Paperclip size={16} />{t('wb_file_library')}</h3><AttachmentsPanel subjectType="cases" subjectId={caseId} readOnly={!context.can_write} /></aside></div>
    {create && <EvidenceForm caseId={caseId} onClose={() => setCreate(false)} />}
  </div>;
}
function EvidenceForm({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const t = useT(); const qc = useQueryClient(); const [error, setError] = useState('');
  const [form, setForm] = useState<EvidenceInput>({ title: '', source: '', conclusion: '', reliability: 'unassessed', assessment: 'observation', attachment_ids: [] });
  const files = useQuery({ queryKey: ['attachments', 'cases', caseId], queryFn: () => attachmentsApi.list('cases', caseId) });
  const mutation = useMutation({ mutationFn: () => workspaceApi.addEvidence(caseId, form), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['case-evidence', caseId] }); void qc.invalidateQueries({ queryKey: ['case-diagnostics', caseId] }); onClose(); }, onError: e => setError(apiErrorMessage(e, t('wb_error'))) });
  const set = <K extends keyof EvidenceInput>(key: K, value: EvidenceInput[K]) => setForm(prev => ({ ...prev, [key]: value }));
  return <Modal title={t('wb_add_evidence')} onClose={onClose} busy={mutation.isPending}><form className="wb-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}><p className="wb-muted">{t('wb_immutable')}</p>
    <label>{t('wb_evidence_title')}<input required maxLength={200} value={form.title} onChange={e => set('title', e.target.value)} /></label><label>{t('wb_source')}<textarea required maxLength={2000} rows={2} value={form.source} onChange={e => set('source', e.target.value)} /></label>
    <div className="wb-form-grid"><label>{t('wb_reliability')}<select aria-label={t('wb_reliability')} value={form.reliability} onChange={e => set('reliability', e.target.value as EvidenceInput['reliability'])}>{(['unassessed', 'low', 'medium', 'high'] as const).map(value => <option value={value} key={value}>{t(`wb_${value}`)}</option>)}</select></label><label>{t('wb_assessment')}<select aria-label={t('wb_assessment')} value={form.assessment} onChange={e => set('assessment', e.target.value as EvidenceInput['assessment'])}>{(['observation', 'inference', 'disputed'] as const).map(value => <option value={value} key={value}>{t(`wb_${value}`)}</option>)}</select></label></div>
    <label>{t('wb_conclusion')}<textarea required rows={5} maxLength={8000} value={form.conclusion} onChange={e => set('conclusion', e.target.value)} /></label><fieldset className="wb-checks"><legend>{t('wb_files')}</legend><QueryState query={files} />{files.data?.map(f => <label key={f.id}><input type="checkbox" checked={form.attachment_ids.includes(f.id)} disabled={!form.attachment_ids.includes(f.id) && form.attachment_ids.length >= 20} onChange={e => set('attachment_ids', e.target.checked ? [...form.attachment_ids, f.id] : form.attachment_ids.filter(id => id !== f.id))} /><span>{f.filename}</span></label>)}</fieldset>
    <EvidenceClaims caseId={caseId} claims={form.claims ?? []} onChange={claims => set('claims', claims)}/>
    <ErrorMessage message={error} /><button className="dashboard-primary-button" disabled={mutation.isPending || !form.title.trim() || !form.source.trim() || !form.conclusion.trim()}>{mutation.isPending ? t('common_loading') : t('wb_save')}</button>
  </form></Modal>;
}

function EvidenceProvenance({ caseId, evidenceId, author, classification }: { caseId: string; evidenceId: string; author: string; classification: string }) {
	const t = useT(); const user = useAuthStore(s => s.user); const [checked, setChecked] = useState(false);
	const query = useQuery({ queryKey: ['evidence-verification', caseId, evidenceId, user?.id], queryFn: () => workspaceApi.verifyEvidence(caseId, evidenceId), enabled: checked });
	return <details className="wb-history"><summary>{t('wb_provenance')}</summary><p>{t('wb_created_by')}: {author}</p><p>{t('wb_access_classification')}: {classification}</p><code>{evidenceId}</code><p className="wb-muted">{t('wb_immutable')}</p><p className="wb-muted">{t('wb_snapshot_note')}</p><button className="dashboard-secondary-button" disabled={query.isFetching} onClick={() => { if (checked) void query.refetch(); else setChecked(true); }}>{t('wb_verify_snapshot')}</button>{checked && <QueryState query={query}/>} {checked && query.data && !query.isError && <p role="status" className={query.data.status === 'mismatch' ? 'wb-danger' : 'wb-muted'}>{t(`wb_snapshot_${query.data.status}`)}<br/><code style={{ overflowWrap: 'anywhere' }}>{query.data.actual_sha256}</code></p>}</details>;
}


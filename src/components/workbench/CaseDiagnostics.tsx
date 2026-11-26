'use client';
import {recordAnchor,focusRecord} from './RecordFocus';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspaceApi, type CaseWorkspace, type ClaimConflict } from '../../lib/workspaceApi';
import { casesApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import { QueryState, ErrorMessage, DateLabel } from './Shared';
import { useDiagnosticCopy } from './DiagnosticCopy';

export default function CaseDiagnostics({ caseId, context }: { caseId: string; context: CaseWorkspace }) {
  const copy = useDiagnosticCopy(); const user = useAuthStore(s => s.user);
  const query = useQuery({ queryKey: ['case-diagnostics', caseId, user?.id], queryFn: () => workspaceApi.diagnostics(caseId) });
  const data = query.isError ? undefined : query.data;
  return <div className="wb-stack"><div className="wb-toolbar"><div><h2>{copy.title}</h2><p>{copy.note}</p></div><button className="dashboard-secondary-button" disabled={query.isFetching} onClick={() => void query.refetch()}>{copy.refresh}</button></div><QueryState query={query}/>
    {data && <><section className="wb-evidence-card"><h3><span style={{ fontSize: 32 }}>{data.score}%</span></h3><progress aria-label={copy.title} max={100} value={data.score} className="wb-readiness-progress"/>{data.truncated && <p role="status" className="wb-danger">{copy.partial}</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>{data.checks.map(check => <li key={check.key} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}><span aria-label={check.passed ? '✓' : '○'}>{check.passed ? '✓' : '○'}</span><span style={{ flex: 1, minWidth: 150 }}>{copy.checks[check.key as keyof typeof copy.checks] ?? check.key}{!check.passed && check.missing > 0 && <small className="wb-muted"> · {copy.missing}: {check.missing}</small>}</span><Link href={check.key === 'description' ? (context.can_write ? '#case-preparation' : '/cases') : check.key === 'entities' ? `/graph/${encodeURIComponent(caseId)}` : `/workbench?case=${encodeURIComponent(caseId)}&tab=${encodeURIComponent(check.tab)}`} className="dashboard-text-link">{copy.fix}</Link></li>)}</ul>
    </section>{context.can_write && <DescriptionEditor key={data.description} caseId={caseId} description={data.description ?? ''} updatedAt={data.updated_at}/>}<section className="wb-stack"><h3>{copy.conflicts}</h3><p className="wb-muted">{copy.conflictNote}</p><p>{copy.coverage}: {data.claims_count} / {data.evidence_count}</p>{!data.conflicts.length && <p className="wb-muted">{copy.empty}</p>}{!context.can_review && <p className="wb-muted">{copy.reviewNote}</p>}{data.conflicts.map(conflict => <ConflictCard key={`${conflict.id}-${conflict.fingerprint}-${conflict.reviewed_at ?? ''}`} caseId={caseId} conflict={conflict} canReview={context.can_review && context.can_write}/>)}</section></>}
  </div>;
}
function DescriptionEditor({caseId,description,updatedAt}:{caseId:string;description:string;updatedAt?:string}) {
  const copy=useDiagnosticCopy();const t=useT();const qc=useQueryClient();const [value,setValue]=useState(description);
  const mutation=useMutation({mutationFn:()=>casesApi.update(caseId,{description:value,...(updatedAt?{expected_updated_at:updatedAt}:{})}),onSuccess:()=>{void qc.invalidateQueries({queryKey:['cases']});void qc.invalidateQueries({queryKey:['case-diagnostics',caseId]});}});
  return <form id="case-preparation" className="wb-form wb-evidence-card" onSubmit={e=>{e.preventDefault();mutation.mutate();}}><label>{copy.checks.description}<textarea rows={3} maxLength={8000} value={value} onChange={e=>setValue(e.target.value)}/></label>{mutation.isError&&<ErrorMessage message={apiErrorMessage(mutation.error,t('wb_error'))}/>}<button className="dashboard-secondary-button" disabled={mutation.isPending||value===description}>{t('wb_save')}</button></form>;
}
function ConflictCard({ caseId, conflict, canReview }: { caseId: string; conflict: ClaimConflict; canReview: boolean }) {
  const copy = useDiagnosticCopy(); const t = useT(); const qc = useQueryClient(); const [reason, setReason] = useState(''); const [status, setStatus] = useState('confirmed');
  const mutation = useMutation({ mutationFn: () => workspaceApi.reviewConflict(caseId, conflict.id, { fingerprint: conflict.fingerprint, status, reason }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['case-diagnostics', caseId] }); } });
  return <article id={recordAnchor("conflict",conflict.id)} ref={node=>focusRecord(node,"conflict",conflict.id)} className="wb-evidence-card"><header><h3>{conflict.field}</h3><span className="wb-badge">{copy[conflict.status]}</span></header><code style={{ overflowWrap: 'anywhere' }}>{conflict.entity_id}</code><div className="wb-form-grid">{conflict.sides.map(side => <blockquote key={side.evidence_id} style={{ margin: '12px 0', padding: 12, minWidth: 0, borderLeft: '3px solid var(--border-subtle)' }}><strong>{side.title}</strong><p className="wb-prose">{side.claim.value}</p><p className="wb-muted">{side.source}</p><small>{side.claim.valid_from?.slice(0, 10) ?? '−∞'} → {side.claim.valid_to?.slice(0, 10) ?? '+∞'}</small></blockquote>)}</div>
    {conflict.reason && <p className="wb-prose">{conflict.reason}<br/><small className="wb-muted">{conflict.reviewed_by} {conflict.reviewed_at && <DateLabel value={conflict.reviewed_at}/>}</small></p>}
    {canReview && <form className="wb-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}><label>{copy.conflicts}<select value={status} onChange={e => setStatus(e.target.value)}>{(['confirmed', 'dismissed', 'resolved'] as const).map(v => <option key={v} value={v}>{copy[v]}</option>)}</select></label><label>{copy.reason}<textarea required rows={2} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)}/></label>{mutation.isError && <ErrorMessage message={apiErrorMessage(mutation.error, t('wb_error'))}/>}<button className="dashboard-primary-button" disabled={mutation.isPending || !reason.trim()}>{copy.review}</button></form>}
  </article>;
}


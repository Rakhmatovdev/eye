'use client';
import React,{useState} from 'react';
import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {reviewApi} from '../../lib/analyticsReview';
import {useAuthStore} from '../../store/authStore';
import {QueryState,DateLabel,ErrorMessage} from './Shared';
import {useReviewCopy} from './ReviewCopy';
import {useActionCopy} from './ActionCopy';
import {QualityMonitoring,QualityDecisionForm} from './QualityActions';
import {recordAnchor} from './RecordFocus';
import {triggerDownload} from '../../lib/download';
import {apiErrorMessage} from '../../lib/apiClient';
export default function DataQuality({caseId}:{caseId:string}){
 const copy=useReviewCopy(),actionCopy=useActionCopy(),user=useAuthStore(s=>s.user);
 const [kindFilter,setKindFilter]=useState('all'),[statusFilter,setStatusFilter]=useState('all'),[exportError,setExportError]=useState('');
 const q=useQuery({queryKey:['data-quality',caseId,user?.id],queryFn:()=>reviewApi.quality(caseId),refetchInterval:30000});const data=q.isError?undefined:q.data;
 const filteredIssues=(data?.issues??[]).filter(r=>{
  if(kindFilter!=='all'&&r.kind!==kindFilter)return false;
  if(statusFilter!=='all'&&(r.decision?.status??'open')!==statusFilter)return false;
  return true;
 });
 return <section className="brief-source data-quality"><div className="brief-live-bar"><h3>{copy.quality}</h3><div className="wb-actions">{reviewApi.exportQualityCsv&&<button type="button" className="dashboard-text-link" onClick={async()=>{try{setExportError('');triggerDownload(await reviewApi.exportQualityCsv(caseId),'case-data-quality.csv');}catch(e){setExportError(apiErrorMessage(e,actionCopy.error));}}}>{copy.exportCsv}</button>}<button className="dashboard-text-link" disabled={q.isFetching} onClick={()=>void q.refetch()}>{copy.refresh}</button></div></div><p>{copy.qualityNote}</p><ErrorMessage message={exportError}/><QueryState query={q}/>{data&&<>{data.monitor&&<QualityMonitoring key={`${data.monitor.enabled}-${data.monitor.interval_minutes}`} caseId={caseId} monitor={data.monitor}/>}<p>{copy.scan}: {data.entities_scanned} / {data.evidence_scanned} / {data.sources_scanned} · <DateLabel value={data.at}/></p>{data.limited&&<p className="brief-notice">{copy.limited}</p>}<div className="wb-form-grid">{[{key:'missing_label',n:data.missing_labels},{key:'duplicate_candidate',n:data.duplicate_groups},{key:'unassessed',n:data.unassessed_evidence},{key:'claim_conflict',n:data.unresolved_conflicts},{key:'stale_source',n:data.stale_sources},{key:'missing_source_value',n:data.missing_sources}].map(r=><div className="brief-rule" key={r.key}><strong>{copy.kinds[r.key as keyof typeof copy.kinds]}</strong><p>{r.n}</p></div>)}</div>{data.issues.length>0&&<div className="wb-form-grid"><label>{copy.filterKind}<select aria-label={copy.filterKind} value={kindFilter} onChange={e=>setKindFilter(e.target.value)}><option value="all">{copy.allKinds}</option><option value="missing_label">{copy.kinds.missing_label}</option><option value="duplicate_candidate">{copy.kinds.duplicate_candidate}</option><option value="unassessed_evidence">{copy.kinds.unassessed}</option><option value="claim_conflict">{copy.kinds.claim_conflict}</option><option value="stale_source">{copy.kinds.stale_source}</option><option value="missing_source_value">{copy.kinds.missing_source_value}</option></select></label><label>{copy.filterStatus}<select aria-label={copy.filterStatus} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">{copy.allStatuses}</option>{Object.entries(actionCopy.statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>}{!data.issues.length&&!data.unassessed_evidence&&<p>{copy.empty}</p>}<ul className="decision-records">{filteredIssues.map((r,i)=><li key={`${r.key??r.id}-${r.fingerprint}-${r.decision?.version??0}-${i}`}><strong>{r.kind==='unassessed_evidence'?copy.kinds.unassessed:copy.kinds[r.kind as keyof typeof copy.kinds]} · {r.count}</strong><Link className="dashboard-text-link" href={r.kind==='duplicate_candidate'||r.kind==='missing_label'?`/entity/${encodeURIComponent(r.id)}`:`/workbench?case=${encodeURIComponent(caseId)}&tab=${r.kind==='claim_conflict'?'diagnostics':r.kind==='unassessed_evidence'?'evidence':'brief_analytics'}#${recordAnchor(r.kind==='claim_conflict'?'conflict':r.kind==='unassessed_evidence'?'evidence':'source',r.target??r.id)}`}>{r.title}</Link>{r.ids&&<div className="wb-actions">{r.ids.map(id=><Link className="dashboard-text-link" key={id} href={`/entity/${encodeURIComponent(id)}`}>{id}</Link>)}</div>}<QualityDecisionForm caseId={caseId} issue={r} data={data}/></li>)}</ul></>}</section>;
}

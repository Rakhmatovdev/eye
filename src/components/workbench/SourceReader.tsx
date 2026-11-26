'use client';
import {useMutation,useQuery} from '@tanstack/react-query';
import Modal from '../common/Modal';
import {attachmentsApi} from '../../lib/api';
import {workspaceApi,type CaseAnalysis} from '../../lib/workspaceApi';
import {useAuthStore} from '../../store/authStore';
import {triggerDownload} from '../../lib/download';
import {useT} from '../../lib/i18n';
import {QueryState} from './Shared';
export default function SourceReader({caseId,citation:c,onClose}:{caseId:string;citation:CaseAnalysis['citations'][number];onClose:()=>void}) {
 const t=useT(),user=useAuthStore(s=>s.user);const query=useQuery({queryKey:['case-evidence',caseId,user?.id],queryFn:()=>workspaceApi.evidence(caseId)});
 const ev=query.data?.find(e=>c.id===`case-evidence:${e.id}`||c.id.startsWith(`case-file:${e.id}:`));
 const download=useMutation({mutationFn:async(file:{id:string;filename:string})=>{triggerDownload(await attachmentsApi.download('cases',caseId,file.id),file.filename);}});
 return <Modal title={c.filename??ev?.title??t('wb_analysis_sources')} onClose={onClose} busy={download.isPending}><div className="wb-stack"><p>{c.classification}{c.page?` · ${t('pro_page')} ${c.page}`:''}</p><h4>{t('pro_cited_excerpt')}</h4><blockquote className="wb-prose">{c.excerpt}</blockquote><code className="wb-report-hash">SHA-256: {c.snapshot_sha256}</code><QueryState query={query}/>{ev&&!query.isError&&<><h4>{t('wb_source')}: {ev.source}</h4><p className="wb-prose">{ev.conclusion}</p>{ev.files.map(file=><button className="dashboard-secondary-button" key={file.id} disabled={download.isPending} onClick={()=>download.mutate(file)}>{t('pro_original_file')}: {file.filename}</button>)}</>}{download.isError&&<p role="alert">{t('common_load_error')}</p>}<a className="dashboard-text-link" href={`/workbench?case=${encodeURIComponent(caseId)}&tab=evidence`}>{t('wb_evidence')}</a></div></Modal>;
}

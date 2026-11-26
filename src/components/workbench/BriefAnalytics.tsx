'use client';
import React,{useEffect,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {Activity,FileText,Pause,Play,RefreshCw} from 'lucide-react';
import {attachmentsApi} from '../../lib/api';
import {apiErrorMessage} from '../../lib/apiClient';
import {briefApi,briefMetricKeys,addBriefPoint,briefSparkline,type AnalyticsBrief,type BriefRequirement,type BriefMetric,type BriefBucket,type BriefPoint} from '../../lib/briefAnalytics';
import type {CaseWorkspace} from '../../lib/workspaceApi';
import {useAuthStore} from '../../store/authStore';
import {useBriefCopy} from './BriefCopy';
import {ErrorMessage,QueryState,DateLabel} from './Shared';
import AnalyticsSources from './AnalyticsSources';
import AnalyticsHistory from './AnalyticsHistory';
import BriefMatrix from './BriefMatrix';
import BriefComparison from './BriefComparison';
import BriefVersions from './BriefVersions';
import DataQuality from './DataQuality';
import {useRequirementPage} from './RequirementPaging';
import {growthApi} from '../../lib/analyticsGrowth';
import {useGrowthCopy} from './GrowthCopy';
import {triggerDownload} from '../../lib/download';

export default function BriefAnalytics({caseId,context}:{caseId:string;context:CaseWorkspace}) {
 const copy=useBriefCopy(),user=useAuthStore(s=>s.user),qc=useQueryClient();
 const [selected,setSelected]=useState(''),[editing,setEditing]=useState(false),[downloadError,setDownloadError]=useState('');
 const query=useQuery({queryKey:['analytics-briefs',caseId,user?.id],queryFn:()=>briefApi.list(caseId)});
 const plan=query.data?.find(p=>p.id===selected)||query.data?.[0];
 const setPlan=(p:AnalyticsBrief)=>{qc.setQueryData<AnalyticsBrief[]>(['analytics-briefs',caseId,user?.id],rows=>[p,...(rows||[]).filter(r=>r.id!==p.id)].slice(0,20));setSelected(p.id);};
 return <div className="wb-stack brief-analytics"><div className="wb-toolbar"><div><h2><Activity size={20}/>{copy.title}</h2><p>{copy.note}</p></div></div>
 {context.can_write&&<BriefUpload caseId={caseId} onCreated={p=>{setPlan(p);setEditing(true);}}/>}
 <AnalyticsSources caseId={caseId} canWrite={context.can_write}/><DataQuality key={`quality-${caseId}`} caseId={caseId}/><BriefVersions key={`versions-${caseId}`} caseId={caseId} revisionKey={query.data?.map(p=>`${p.id}:${p.revision}`).join('|')??''}/><QueryState query={query}/>{!query.isPending&&!query.isError&&!plan&&<p className="wb-empty">{copy.empty}</p>}
 {plan&&!query.isError&&<><label className="brief-plan-select">{copy.plans}<select value={plan.id} onChange={e=>{setSelected(e.target.value);setEditing(false);}}>{query.data?.map(p=><option key={p.id} value={p.id}>{p.title} · {copy.revision} {p.revision}</option>)}</select></label>
 <section className="brief-source"><strong>{plan.title}</strong><span>{copy.revision} {plan.revision} · {plan.filename}</span><p>{copy.engine}</p>{plan.omitted>0&&<p role="alert" className="wb-error">{copy.partial}: {plan.omitted}</p>}<details><summary>{copy.source}</summary><code>File SHA-256: {plan.file_sha256}<br/>Text SHA-256: {plan.text_sha256}</code><button className="dashboard-text-link" onClick={async()=>{try{triggerDownload(await attachmentsApi.download('cases',caseId,plan.attachment_id),plan.filename);}catch{setDownloadError(copy.error);}}}>{copy.download}</button></details></section>
 <BriefContent key={`${plan.id}-${plan.revision}`} caseId={caseId} plan={plan} canWrite={context.can_write} editing={editing} onEdit={setEditing} onSaved={p=>{setPlan(p);setEditing(false);}} onReload={()=>void query.refetch()}/></>}
 <ErrorMessage message={downloadError}/>
 </div>;
}

function BriefUpload({caseId,onCreated}:{caseId:string;onCreated:(p:AnalyticsBrief)=>void}) {
 const copy=useBriefCopy(),user=useAuthStore(s=>s.user),qc=useQueryClient();const [title,setTitle]=useState(''),[file,setFile]=useState<File|null>(null),[attachment,setAttachment]=useState(''),[error,setError]=useState('');
 const files=useQuery({queryKey:['attachments','cases',caseId,user?.id],queryFn:()=>attachmentsApi.list('cases',caseId)});
 const create=useMutation({mutationFn:async()=>{let id=attachment;if(file){if(file.size>8*1024*1024)throw new Error(copy.formats);const uploaded=await attachmentsApi.upload('cases',caseId,file,{evidenceSource:'Technical brief'});id=uploaded.id;setAttachment(id);setFile(null);void qc.invalidateQueries({queryKey:['attachments','cases',caseId]});}return briefApi.create(caseId,id,title.trim());},onSuccess:p=>{setError('');onCreated(p);},onError:e=>setError(e instanceof Error?apiErrorMessage(e,e.message):copy.error)});
 return <details className="brief-upload"><summary><FileText size={16}/>{copy.upload}</summary><form className="wb-form" onSubmit={e=>{e.preventDefault();setError('');create.mutate();}}><div className="wb-form-grid"><label>{copy.name}<input required maxLength={200} value={title} disabled={create.isPending} onChange={e=>setTitle(e.target.value)}/></label><label>{copy.file}<input key={attachment} type="file" accept=".txt,.md,.docx,.pdf,.png,.jpg,.jpeg" disabled={create.isPending} onChange={e=>{const next=e.target.files?.[0]||null;setFile(next);setAttachment('');if(!title&&next)setTitle(next.name.replace(/\.[^.]+$/,''));}}/></label></div>
 <label>{copy.existing}<select value={attachment} disabled={create.isPending} onChange={e=>{setAttachment(e.target.value);setFile(null);}}><option value="">{copy.select}</option>{files.data?.map(f=><option key={f.id} value={f.id}>{f.filename}</option>)}</select></label>{files.isError&&<QueryState query={files}/>}<p className="wb-muted">{copy.formats}</p><ErrorMessage message={error}/><button className="dashboard-primary-button" disabled={create.isPending||!title.trim()||(!file&&!attachment)}>{create.isPending?copy.extracting:copy.create}</button></form></details>;
}

function BriefContent({caseId,plan,canWrite,editing,onEdit,onSaved,onReload}:{caseId:string;plan:AnalyticsBrief;canWrite:boolean;editing:boolean;onEdit:(v:boolean)=>void;onSaved:(v:AnalyticsBrief)=>void;onReload:()=>void}) {
 const copy=useBriefCopy(),user=useAuthStore(s=>s.user);const [rows,setRows]=useState(plan.requirements),[running,setRunning]=useState(true),[points,setPoints]=useState<BriefPoint[]>([]),[error,setError]=useState(''),[clock,setClock]=useState(Date.now());
 const live=useQuery({queryKey:['brief-live',caseId,plan.id,plan.revision,user?.id],queryFn:({signal})=>briefApi.live(caseId,plan.id,signal),enabled:plan.published&&!editing,refetchInterval:running?5000:false,refetchIntervalInBackground:false,retry:false});
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(live.data&&!live.isError&&live.data.revision===plan.revision)setPoints(p=>addBriefPoint(p,live.data!));},[live.data,live.isError,plan.revision]);
 const growthCopy=useGrowthCopy();const sources=useQuery({queryKey:['analytics-sources',caseId,user?.id],queryFn:()=>growthApi.sources(caseId)});
 const save=useMutation({mutationFn:(published:boolean)=>briefApi.update(caseId,plan,published,rows),onSuccess:p=>{setError('');onSaved(p);},onError:e=>setError(apiErrorMessage(e,copy.error))});
 const patch=(id:string,value:Partial<BriefRequirement>)=>setRows(prev=>prev.map(r=>r.id===id?{...r,...value}:r));
 const changed=!!live.data&&live.data.revision!==plan.revision;
 const stale=live.isError||(running&&live.dataUpdatedAt>0&&clock-live.dataUpdatedAt>15000);
 const data=!live.isError&&!changed?live.data:undefined;
 const mappingPage=useRequirementPage(rows),kpiPage=useRequirementPage(data?.kpis??[]);
 const status={no_data:copy.noData,tracking:copy.tracking,met:copy.met,gap:copy.gap};
 return <div className="wb-stack"><ErrorMessage message={error}/>
 {(editing||!plan.published)&&canWrite?<section className="brief-editor"><p>{copy.review}</p><form className="wb-form" onSubmit={e=>{e.preventDefault();save.mutate(true);}}>{mappingPage.controls}{mappingPage.items.map(row=><fieldset className="brief-rule" key={row.id} disabled={save.isPending}><legend>{copy.line} {row.line}</legend><p className="wb-prose">{row.text}</p><div className="brief-mapping"><label>{copy.metric}<select aria-label={`${copy.metric} ${row.id}`} value={row.metric} onChange={e=>patch(row.id,{metric:e.target.value as BriefMetric,target:undefined,source_id:undefined})}><option value="">{copy.unmapped}</option>{briefMetricKeys.map(k=><option key={k} value={k}>{copy.metrics[k]}</option>)}</select></label>{row.metric==="external"&&<label>{growthCopy.sourceSelect}<select required aria-label={`${growthCopy.sourceSelect} ${row.id}`} value={row.source_id??""} onChange={e=>patch(row.id,{source_id:e.target.value,target:undefined})}><option value="">{growthCopy.sourceSelect}</option>{sources.data?.map(s=><option key={s.id} value={s.id}>{s.name} · {s.unit}</option>)}</select></label>}<label>{copy.operator}<select aria-label={`${copy.operator} ${row.id}`} value={row.operator} onChange={e=>patch(row.id,{operator:e.target.value as 'gte'|'lte'})}><option value="gte">≥</option><option value="lte">≤</option></select></label><label>{copy.target}<input aria-label={`${copy.target} ${row.id}`} type="number" min={row.metric==="external"&&sources.data?.find(s=>s.id===row.source_id)?.unit==="number"?-1000000000:0} max={row.metric.endsWith('_pct')||sources.data?.find(s=>s.id===row.source_id)?.unit==='percent'?100:1000000000} step="any" disabled={!row.metric} value={row.target??''} onChange={e=>patch(row.id,{target:e.target.value===''?undefined:Number(e.target.value)})}/></label></div></fieldset>)}<div className="wb-actions"><button className="dashboard-primary-button" disabled={save.isPending}>{copy.publish}</button><button type="button" className="dashboard-secondary-button" disabled={save.isPending} onClick={()=>save.mutate(false)}>{copy.draft}</button>{plan.published&&<button type="button" className="dashboard-text-link" onClick={()=>{setRows(plan.requirements);onEdit(false);}}>{copy.cancel}</button>}</div></form></section>:<>
 {!plan.published?<p className="brief-notice">{copy.draftNotice}</p>:<><div className="brief-live-bar"><span role="status" className={`brief-live-status ${stale?'is-stale':''}`}><Activity size={15}/>{stale?copy.stale:running?copy.live:copy.paused}</span><div className="wb-actions"><button className="dashboard-secondary-button" onClick={()=>setRunning(v=>!v)}>{running?<Pause size={14}/>:<Play size={14}/>} {running?copy.pause:copy.resume}</button><button aria-label={copy.refresh} className="dashboard-secondary-button" disabled={live.isFetching} onClick={()=>void live.refetch()}><RefreshCw size={14}/>{copy.refresh}</button>{canWrite&&<button className="dashboard-text-link" onClick={()=>onEdit(true)}>{copy.edit}</button>}</div></div>
 <QueryState query={live}/>{changed&&<div className="brief-notice" role="alert">{copy.changed}<button onClick={onReload}>{copy.refresh}</button></div>}
 {data&&<><p className="wb-muted">{copy.at}: <DateLabel value={data.at}/> · {copy.scope}</p>{data.partial&&<p className="brief-notice" role="alert">{copy.limit}</p>}{!data.source_available&&<p className="brief-notice" role="alert">{copy.missingSource}</p>}
 {kpiPage.controls}<div className={`brief-kpis ${stale?'brief-stale':''}`}>{kpiPage.items.map(k=><article className={`brief-kpi brief-kpi-${k.status}`} key={k.id}><header><span>{copy.line} {k.line}</span><span className="wb-badge">{status[k.status]}</span></header><h3>{k.metric==="external"?(sources.data?.find(s=>s.id===k.source_id)?.name??copy.metrics.external):k.metric?copy.metrics[k.metric]:copy.unmapped}</h3><strong className="brief-value">{k.value===null?'—':new Intl.NumberFormat(undefined,{maximumFractionDigits:1}).format(k.value)}{k.value!==null&&k.unit==='percent'?'%':''}</strong><p>{k.target!==undefined?`${k.operator==='gte'?'≥':'≤'} ${k.target}${k.unit==='percent'?'%':''}`:copy.unset}</p><details><summary>{copy.requirement}</summary><p className="wb-prose">{k.text}</p></details>{k.value!==null&&<><svg viewBox="0 0 200 60" role="img" aria-label={`${copy.trend}: ${k.metric?copy.metrics[k.metric]:k.id}`}><title>{copy.trend}</title><polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={briefSparkline(points,k.id)}/></svg><small>{points.length<2?copy.waiting:copy.trend}</small></>}</article>)}</div>
 <div className="brief-charts"><BriefBars title={copy.entityTypes} rows={data.entity_types}/><BriefBars title={copy.taskStatuses} rows={data.task_statuses}/><BriefBars title={copy.events} rows={data.event_hours} hours unavailable={data.partial}/></div></>}
 </>}
 </>}
 {plan.published&&<><BriefMatrix caseId={caseId} plan={plan}/><AnalyticsHistory caseId={caseId} plan={plan}/><BriefComparison caseId={caseId} plan={plan}/></>}</div>;
}
function BriefBars({title,rows,hours=false,unavailable=false}:{title:string;rows:BriefBucket[];hours?:boolean;unavailable?:boolean}) {
 const copy=useBriefCopy();const high=Math.max(1,...rows.map(r=>r.count));return <section className="brief-chart"><h3>{title}</h3>{unavailable?<p className="wb-muted">{copy.noData}</p>:!rows.length?<p className="wb-muted">{copy.zero}</p>:<ul>{rows.map(r=><li key={r.label}><span>{hours?r.label.slice(11,16):r.label}</span><div className="brief-bar"><span style={{width:`${100*r.count/high}%`}}/></div><strong>{r.count}</strong></li>)}</ul>}</section>;
}


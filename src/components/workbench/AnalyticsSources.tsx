'use client';
import {recordAnchor,focusRecord} from './RecordFocus';
import React,{useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {growthApi,type SourceInput,type AnalyticsSource} from '../../lib/analyticsGrowth';
import {useAuthStore} from '../../store/authStore';
import {apiErrorMessage} from '../../lib/apiClient';
import {useGrowthCopy} from './GrowthCopy';
import {DateLabel,ErrorMessage,QueryState} from './Shared';

export default function AnalyticsSources({caseId,canWrite}:{caseId:string;canWrite:boolean}){
 const copy=useGrowthCopy(),user=useAuthStore(s=>s.user),qc=useQueryClient();const [error,setError]=useState('');
 const sources=useQuery({queryKey:['analytics-sources',caseId,user?.id],queryFn:()=>growthApi.sources(caseId),refetchInterval:30000});
 const refresh=()=>void qc.invalidateQueries({queryKey:['analytics-sources',caseId]});
 const [form,setForm]=useState<SourceInput>({name:'',kind:'import',unit:'number',url:'',value_path:'',time_path:'',freshness_minutes:60,poll_minutes:5});
 const create=useMutation({mutationFn:()=>growthApi.createSource(caseId,form),onSuccess:()=>{setError('');setForm(f=>({...f,name:''}));refresh();},onError:e=>setError(apiErrorMessage(e,copy.error))});
 return <details className="brief-source"><summary>{copy.sources}</summary><p>{copy.sourceNote}</p><QueryState query={sources}/>{!sources.isPending&&!sources.isError&&!sources.data?.length&&<p>{copy.empty}</p>}
 {sources.data?.map(s=><SourceCard key={s.id} source={s} caseId={caseId} canWrite={canWrite} onChange={refresh}/>)}
 {canWrite&&<details className="brief-upload"><summary>{copy.newSource}</summary><form className="wb-form" onSubmit={e=>{e.preventDefault();create.mutate();}}><div className="wb-form-grid"><label>{copy.name}<input required maxLength={120} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></label><label>{copy.kind}<select value={form.kind} onChange={e=>setForm(f=>({...f,kind:e.target.value as SourceInput['kind'],url:'',value_path:'',time_path:''}))}><option value="import">{copy.importKind}</option><option value="http">{copy.httpKind}</option></select></label><label>{copy.unit}<select value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value as SourceInput['unit']}))}><option value="number">number</option><option value="count">count</option><option value="percent">%</option></select></label><label>{copy.freshness}<input required type="number" min={form.kind==='http'?form.poll_minutes:1} max="10080" value={form.freshness_minutes} onChange={e=>setForm(f=>({...f,freshness_minutes:Number(e.target.value)}))}/></label></div>
 {form.kind==='http'&&<><label>{copy.url}<input required type="url" placeholder="https://example.org/metrics" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))}/></label><div className="wb-form-grid"><label>{copy.valuePath}<input required placeholder="data.total" value={form.value_path} onChange={e=>setForm(f=>({...f,value_path:e.target.value}))}/></label><label>{copy.timePath}<input placeholder="data.updated_at" value={form.time_path} onChange={e=>setForm(f=>({...f,time_path:e.target.value}))}/></label><label>{copy.poll}<input required type="number" min="1" max="60" value={form.poll_minutes} onChange={e=>setForm(f=>({...f,poll_minutes:Number(e.target.value)}))}/></label></div></>}
 <ErrorMessage message={error}/><button className="dashboard-primary-button" disabled={create.isPending}>{copy.create}</button></form></details>}
 </details>;
}
function SourceCard({source,caseId,canWrite,onChange}:{source:AnalyticsSource;caseId:string;canWrite:boolean;onChange:()=>void}){
 const copy=useGrowthCopy();const [value,setValue]=useState(''),[at,setAt]=useState(new Date().toISOString()),[file,setFile]=useState<File|null>(null),[valueColumn,setValueColumn]=useState('value'),[timeColumn,setTimeColumn]=useState('observed_at'),[sheet,setSheet]=useState(''),[error,setError]=useState(''),[accepted,setAccepted]=useState<number|null>(null);
 const stale=!source.observed_at||Date.now()-Date.parse(source.observed_at)>source.freshness_minutes*60000;
 const action=useMutation({mutationFn:async(kind:'entry'|'import'|'refresh'|'delete')=>{if(kind==='delete'){await growthApi.deleteSource(caseId,source.id);return null;}if(kind==='refresh'){await growthApi.refresh(caseId,source.id);return null;}if(kind==='entry')return growthApi.observe(caseId,source.id,Number(value),at);if(!file)throw Error(copy.file);return growthApi.import(caseId,source.id,file,valueColumn,timeColumn,sheet);},onSuccess:result=>{setError('');setAccepted(result?.accepted??null);onChange();},onError:e=>setError(apiErrorMessage(e,copy.error))});
 return <article id={recordAnchor("source",source.id)} ref={node=>focusRecord(node,"source",source.id)} className="brief-rule growth-source"><header><strong>{source.name}</strong><span className="wb-badge">{source.value===null?copy.noData:stale?copy.stale:copy.healthy}</span></header><p><strong>{source.value??'—'} {source.unit==='percent'?'%':''}</strong> · {source.observed_at&&<DateLabel value={source.observed_at}/>}</p>{source.last_error&&<ErrorMessage message={source.last_error}/>}
 {canWrite&&<><div className="wb-actions">{source.kind==='http'&&<button className="dashboard-secondary-button" disabled={action.isPending} onClick={()=>action.mutate('refresh')}>{copy.refresh}</button>}<button className="dashboard-text-link" disabled={action.isPending} onClick={()=>{if(window.confirm(copy.confirmDelete))action.mutate('delete');}}>{copy.delete}</button></div>
 {source.kind==='import'&&<><form className="wb-form" onSubmit={e=>{e.preventDefault();action.mutate('entry');}}><div className="wb-form-grid"><label>{copy.value}<input required type="number" step="any" value={value} onChange={e=>setValue(e.target.value)}/></label><label>{copy.observed}<input required value={at} onChange={e=>setAt(e.target.value)}/></label></div><button className="dashboard-secondary-button" disabled={action.isPending}>{copy.submit}</button></form><details><summary>{copy.import}</summary><form className="wb-form" onSubmit={e=>{e.preventDefault();action.mutate('import');}}><label>{copy.file}<input required type="file" accept=".csv,.xlsx" onChange={e=>setFile(e.target.files?.[0]??null)}/></label><div className="wb-form-grid"><label>{copy.valueColumn}<input required value={valueColumn} onChange={e=>setValueColumn(e.target.value)}/></label><label>{copy.timeColumn}<input required value={timeColumn} onChange={e=>setTimeColumn(e.target.value)}/></label><label>{copy.sheet}<input value={sheet} onChange={e=>setSheet(e.target.value)}/></label></div><p>{copy.importNote}</p><button className="dashboard-secondary-button" disabled={action.isPending||!file}>{copy.import}</button></form></details></>}
 </>}
 <ErrorMessage message={error}/>{accepted!==null&&<p role="status">{copy.success}: {accepted}</p>}
 </article>;
}


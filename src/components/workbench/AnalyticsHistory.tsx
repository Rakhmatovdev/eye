'use client';
import React,{useEffect,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {growthApi} from '../../lib/analyticsGrowth';
import {briefSparkline,type AnalyticsBrief,type BriefPoint} from '../../lib/briefAnalytics';
import {apiErrorMessage} from '../../lib/apiClient';
import {useAuthStore} from '../../store/authStore';
import {useGrowthCopy} from './GrowthCopy';
import {DateLabel,ErrorMessage,QueryState} from './Shared';
export default function AnalyticsHistory({caseId,plan}:{caseId:string;plan:AnalyticsBrief}){
 const copy=useGrowthCopy(),user=useAuthStore(s=>s.user),qc=useQueryClient();const [days,setDays]=useState(1),[enabled,setEnabled]=useState(false),[alerts,setAlerts]=useState(false),[interval,setIntervalMinutes]=useState(1),[metric,setMetric]=useState(plan.requirements[0]?.id||''),[error,setError]=useState('');
 const monitor=useQuery({queryKey:['analytics-monitor',caseId,plan.id,user?.id],queryFn:()=>growthApi.monitor(caseId,plan.id),refetchInterval:30000});
 useEffect(()=>{if(monitor.data){setEnabled(monitor.data.enabled);setAlerts(monitor.data.alerts);setIntervalMinutes(monitor.data.interval_minutes);}},[monitor.data]);
 const history=useQuery({queryKey:['analytics-history',caseId,plan.id,plan.revision,user?.id,days],queryFn:()=>growthApi.history(caseId,plan.id,days),refetchInterval:monitor.data?.enabled?15000:false});
 const save=useMutation({mutationFn:()=>growthApi.saveMonitor(caseId,plan.id,{enabled,alerts,interval_minutes:interval}),onSuccess:async()=>{setError('');await qc.invalidateQueries({queryKey:['analytics-monitor',caseId,plan.id]});void qc.invalidateQueries({queryKey:['analytics-history',caseId,plan.id]});},onError:e=>setError(apiErrorMessage(e,copy.error))});
 const points:BriefPoint[]=(history.data?.points??[]).map(p=>({at:p.at,values:Object.fromEntries(p.kpis.filter(k=>k.value!==null).map(k=>[k.id,k.value!]))}));
 const selected=history.data?.points.flatMap(p=>p.kpis.filter(k=>k.id===metric).map(k=>({at:p.at,k})))??[];
 return <section className="brief-source growth-history"><h3>{copy.monitor}</h3><QueryState query={monitor}/>{monitor.data&&!monitor.isError&&<form className="wb-form" onSubmit={e=>{e.preventDefault();save.mutate();}}><label className="growth-check"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>{copy.enabled}</label><label className="growth-check"><input type="checkbox" checked={alerts} onChange={e=>setAlerts(e.target.checked)}/>{copy.alerts}</label><label>{copy.interval}<input type="number" min="1" max="60" required value={interval} onChange={e=>setIntervalMinutes(Number(e.target.value))}/></label><button className="dashboard-secondary-button" disabled={save.isPending}>{copy.save}</button><p>{copy.note}</p>{monitor.data.last_at?<p>{copy.last}: <DateLabel value={monitor.data.last_at}/></p>:monitor.data.enabled&&<p>{copy.pending}</p>}{monitor.data.error&&<ErrorMessage message={monitor.data.error}/>}</form>}
 <ErrorMessage message={error}/><div className="brief-live-bar"><h3>{copy.history}</h3><label>{copy.range}<select aria-label={copy.range} value={days} onChange={e=>setDays(Number(e.target.value))}><option value="1">{copy.day}</option><option value="7">{copy.week}</option><option value="30">{copy.month}</option></select></label></div><QueryState query={history}/>
 {history.data&&!history.isError&&(!points.length?<p>{copy.historyEmpty}</p>:<><label>{copy.selectMetric}<select aria-label={copy.selectMetric} value={metric} onChange={e=>setMetric(e.target.value)}>{plan.requirements.map(r=><option key={r.id} value={r.id}>{r.id} · {r.text.slice(0,90)}</option>)}</select></label>{selected.some(p=>p.k.value!==null)?<svg className="growth-history-chart" viewBox="0 0 200 60" role="img" aria-label={copy.historySource}><polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={briefSparkline(points,metric)}/>{selected.filter(p=>p.k.value!==null).length===1&&<circle cx="100" cy="30" r="2" fill="currentColor"/>}</svg>:<p>{copy.noData}</p>}<p>{copy.latestBucket}</p><div className="growth-history-table"><table><thead><tr><th>{copy.observed}</th><th>{copy.value}</th></tr></thead><tbody>{selected.map(({at,k})=><tr key={at}><td><DateLabel value={at}/></td><td>{k.value??'—'}{k.value!==null&&k.unit==='percent'?'%':''}</td></tr>)}</tbody></table></div></>)}
 </section>;
}

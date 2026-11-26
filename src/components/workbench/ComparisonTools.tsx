'use client';
import React, {useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {casesApi,workflowApi} from '../../lib/api';
import {workspaceApi,type CaseWorkspace} from '../../lib/workspaceApi';
import {compareFields,entityFields,researchApi,snapshotFields,workload} from '../../lib/research';
import {apiErrorMessage} from '../../lib/apiClient';
import {useAuthStore} from '../../store/authStore';
import {useT} from '../../lib/i18n';
import EntityHistory from './EntityHistory';
import {DateLabel,ErrorMessage,QueryState} from './Shared';

export function FieldComparison({rows,left,right}:{rows:ReturnType<typeof compareFields>;left?:string;right?:string}) {
  const t=useT();
  return <div className="pro-table-scroll"><table className="pro-table"><thead><tr><th scope="col">{t('pro_field')}</th><th scope="col">{left??t('pro_before')}</th><th scope="col">{right??t('pro_after')}</th></tr></thead><tbody>{rows.map(row=><tr key={row.field} className={row.changed?'pro-difference':''}><th scope="row">{row.changed&&<span aria-label={t('pro_differences')}>● </span>}{row.field}</th><td><code>{row.before}</code></td><td><code>{row.after}</code></td></tr>)}</tbody></table>{!rows.length&&<p className="wb-empty">{t('pro_unchanged')}</p>}</div>;
}

export function EntityComparison({caseId}:{caseId:string}) {
  const t=useT();const user=useAuthStore(s=>s.user);const query=useQuery({queryKey:['case-entities',caseId,user?.id],queryFn:()=>casesApi.entities(caseId)});
  const [left,setLeft]=useState('');const [right,setRight]=useState('');const [only,setOnly]=useState(false);
  const a=query.data?.find(e=>e.id===left)??query.data?.[0];const alternatives=query.data?.filter(e=>e.id!==a?.id)??[];const b=alternatives.find(e=>e.id===right)??alternatives[0];
  return <div className="wb-stack"><h2>{t('wb_compare_entities')}</h2><QueryState query={query}/>{!query.isPending&&!query.isError&&(!a||!b)&&<p className="wb-empty">{t('pro_select_two')}</p>}{a&&b&&!query.isError&&<><div className="wb-form wb-form-grid"><label>{t('pro_left')}<select value={a.id} onChange={e=>setLeft(e.target.value)}>{query.data?.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label><label>{t('pro_right')}<select value={b.id} onChange={e=>setRight(e.target.value)}>{alternatives.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label></div><label className="pro-check"><input type="checkbox" checked={only} onChange={e=>setOnly(e.target.checked)}/>{t('pro_differences')}</label><FieldComparison rows={compareFields(entityFields(a),entityFields(b)).filter(r=>!only||r.changed)} left={a.name} right={b.name}/></>}</div>;
}

export function ChangeTracking({caseId,context}:{caseId:string;context:CaseWorkspace}) {
  const t=useT();const user=useAuthStore(s=>s.user);const qc=useQueryClient();const [selected,setSelected]=useState('');const [error,setError]=useState('');
  const query=useQuery({queryKey:['entity-watches',caseId,user?.id],queryFn:()=>researchApi.watches(caseId),refetchInterval:30000});
  const entities=useQuery({queryKey:['case-entities',caseId,user?.id],queryFn:()=>casesApi.entities(caseId)});
  const choices=entities.data?.filter(e=>!query.data?.some(w=>w.baseline.id===e.id))??[];
  const entityId=choices.find(e=>e.id===selected)?.id??choices[0]?.id??'';
  const mutation=useMutation({mutationFn:({id,remove}:{id:string;remove?:boolean})=>remove?researchApi.unwatch(caseId,id):researchApi.capture(caseId,id),onSuccess:()=>{setError('');void qc.invalidateQueries({queryKey:['entity-watches',caseId]});},onError:e=>setError(apiErrorMessage(e,t('wb_error')))});
  return <div className="wb-stack"><div className="wb-toolbar"><h2>{t('wb_changes')}</h2><button className="dashboard-secondary-button" onClick={()=>query.refetch()} disabled={query.isFetching}>{t('pro_refresh')}</button></div><p className="wb-muted">{t('pro_tracking_note')}</p><ErrorMessage message={error}/><QueryState query={query}/><QueryState query={entities}/>{context.can_write&&!query.isError&&!entities.isError&&<div className="wb-form wb-form-grid"><label>{t('pro_entity')}<select value={entityId} onChange={e=>setSelected(e.target.value)}>{!choices.length&&<option value="">{t('wb_empty')}</option>}{choices.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label><button className="dashboard-primary-button" disabled={!entityId||mutation.isPending||query.isPending} onClick={()=>mutation.mutate({id:entityId})}>{t('pro_track')}</button></div>}{!query.isError&&query.data?.map(w=>{const rows=compareFields(snapshotFields(w.baseline),snapshotFields(w.current)).filter(r=>r.changed);return <article className="pro-panel" key={w.id}><div className="wb-toolbar"><h3>{String(w.current.properties?.label??w.current.properties?.name??w.current.id)}</h3><span className={rows.length?'wb-danger':'wb-muted'}>{rows.length?`${rows.length} ${t('pro_differences')}`:t('pro_unchanged')}</span></div><p className="wb-muted"><DateLabel value={w.captured_at}/></p><EntityHistory watch={w}/>{context.can_write&&<div className="wb-actions"><button className="dashboard-secondary-button" disabled={mutation.isPending||!rows.length} onClick={()=>mutation.mutate({id:w.baseline.id})}>{t('pro_acknowledge')}</button><button className="dashboard-text-link" disabled={mutation.isPending} onClick={()=>mutation.mutate({id:w.baseline.id,remove:true})}>{t('pro_remove')}</button></div>}</article>;})}</div>;
}

export function TeamWorkload() {
  const t=useT();const user=useAuthStore(s=>s.user);
  // Complete all authorized case reads before rendering totals: a failed request
  // must not silently turn a partial result into a team-wide total.
  const query=useQuery({queryKey:['team-workload',user?.id],queryFn:async()=>{
    const cases=await casesApi.list();const rows=[];
    for(let i=0;i<cases.length;i+=5){rows.push(...await Promise.all(cases.slice(i,i+5).map(async c=>({case:c,tasks:await workflowApi.list(c.id),context:await workspaceApi.context(c.id)}))));}
    return rows;
  },refetchInterval:60000});
  const rows=query.data??[];const names=new Map(rows.flatMap(r=>r.context.participants.map(p=>[p.id,p.name] as const)));const summary=workload(rows.flatMap(r=>r.tasks));
  const [person,setPerson]=useState('');
  return <div className="wb-stack"><div className="wb-toolbar"><h2>{t('wb_workload')}</h2><button className="dashboard-secondary-button" disabled={query.isFetching} onClick={()=>query.refetch()}>{t('pro_refresh')}</button></div><p className="wb-muted">{t('pro_workload_note')}</p><QueryState query={query} empty={!rows.length}/>{!query.isError&&!query.isPending&&<><div className="pro-table-scroll"><table className="pro-table"><thead><tr><th>{t('wb_assignee')}</th>{(['active','review','completed','soon'] as const).map(k=><th key={k}>{t(`pro_${k}`)}</th>)}<th>{t('workflow_overdue')}</th></tr></thead><tbody>{Object.entries(summary).sort((a,b)=>b[1].overdue-a[1].overdue||b[1].active-a[1].active).map(([id,v])=><tr key={id}><th><button aria-pressed={person===id} onClick={()=>setPerson(person===id?'':id)}>{names.get(id)??id}</button></th><td>{v.active}</td><td>{v.review}</td><td>{v.completed}</td><td>{v.soon}</td><td className={v.overdue?'wb-danger':''}>{v.overdue}</td></tr>)}</tbody></table></div><div className="pro-grid">{rows.filter(r=>r.tasks.some(task=>(!person||task.assignee_id===person)&&task.status!=='completed')).map(r=><article key={r.case.id} className="pro-panel"><a className="dashboard-text-link" href={`/workbench?case=${encodeURIComponent(r.case.id)}&tab=board`}>{r.case.title}</a>{r.tasks.filter(task=>(!person||task.assignee_id===person)&&task.status!=='completed').map(task=><div className="pro-workload-task" key={task.id}><strong>{task.title}</strong><span>{names.get(task.assignee_id)??task.assignee_id} · {t(`workflow_status_${task.status}`)}</span>{task.due_at&&<span className={Date.parse(task.due_at)<Date.now()?'wb-danger':''}><DateLabel value={task.due_at}/></span>}</div>)}</article>)}</div></>}</div>;
}

'use client';
import React,{useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {decisionsApi} from '../../lib/analyticsDecisions';
import {useAuthStore} from '../../store/authStore';
import {useLocaleStore} from '../../store/localeStore';
import {useDecisionCopy} from './DecisionCopy';
import {useReviewCopy} from './ReviewCopy';
import {DateLabel,QueryState} from './Shared';
export default function MatrixHistory({caseId,planId,reqId,revision}:{caseId:string;planId:string;reqId:string;revision:number}){
 const locale=useLocaleStore(s=>s.locale),user=useAuthStore(s=>s.user),copy=useDecisionCopy(),review=useReviewCopy();const [open,setOpen]=useState(false),[before,setBefore]=useState(0),[trail,setTrail]=useState<number[]>([]);
 const labels={uz:['Tahrirlar tarixi','Eski tahrirlar','Yangi tahrirlar','Bu reviziyada tarix mavjud emas.','Muallif'],en:['Edit history','Older edits','Newer edits','No history retained in this revision.','Author'],ru:['История изменений','Старые изменения','Новые изменения','В этой редакции нет истории.','Автор']}[locale];
 const q=useQuery({queryKey:['matrix-history',caseId,planId,reqId,revision,user?.id,before],queryFn:()=>decisionsApi.history(caseId,planId,reqId,before),enabled:open});const data=q.isError?undefined:q.data;
 return <details className="matrix-history" onToggle={e=>setOpen(e.currentTarget.open)}><summary>{labels[0]}</summary>{open&&<><QueryState query={q}/>{data&&<>{!data.rows.length&&<p>{labels[3]}</p>}{data.rows.map(({record:r})=><section key={r.version} className="brief-rule"><strong>v{r.version} · {copy.statusNames[r.status as keyof typeof copy.statusNames]}</strong><p>{labels[4]}: {r.updated_by} · <DateLabel value={r.updated_at}/></p>{r.notes&&<p className="wb-prose">{r.notes}</p>}<h5>{review.criteria}</h5><ul>{r.criteria?.map(c=><li key={c.id}><strong>{c.passed?'✓':'○'} {c.text}</strong>{c.basis&&<p className="wb-prose">{c.basis}</p>}</li>)}</ul></section>)}<div className="wb-actions">{!!trail.length&&<button className="dashboard-secondary-button" onClick={()=>{setBefore(trail[trail.length-1]);setTrail(t=>t.slice(0,-1));}}>{labels[2]}</button>}{data.next>0&&<button className="dashboard-secondary-button" onClick={()=>{setTrail(t=>[...t,before]);setBefore(data.next);}}>{labels[1]}</button>}</div></>}</>}</details>;
}

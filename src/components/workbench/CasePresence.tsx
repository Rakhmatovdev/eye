'use client';
import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {workspaceApi} from '../../lib/workspaceApi';
import {useAuthStore} from '../../store/authStore';
import {useT} from '../../lib/i18n';
import {useOperationsCopy} from './OperationsCopy';
export default function CasePresence({caseId,area}:{caseId:string;area:string}){
 const user=useAuthStore(s=>s.user);const copy=useOperationsCopy();const t=useT();const [failed,setFailed]=useState(false);const query=useQuery({queryKey:['case-presence',caseId,user?.id],queryFn:()=>workspaceApi.presence(caseId),refetchInterval:15000,enabled:!!user});
 useEffect(()=>{if(!user)return;const session=crypto.randomUUID();let active=true;const touch=()=>{if(document.visibilityState!=='visible')return;void workspaceApi.touchPresence(caseId,area,session).then(()=>{if(active){setFailed(false);void query.refetch();}}).catch(()=>{if(active)setFailed(true);});};touch();const timer=setInterval(touch,20000);document.addEventListener('visibilitychange',touch);return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',touch);void workspaceApi.leavePresence(caseId,session).catch(()=>{});};},[caseId,area,user?.id]);
 const people=(query.isError?[]:query.data??[]).filter(p=>p.user_id!==user?.id);
 return <div className="wb-presence" aria-label={copy.online} title={copy.presenceNote}>{(query.isError||failed)&&<span role="status">{copy.connection}</span>}{people.map(p=><span className="wb-presence-person" key={p.user_id}><b>{p.name.slice(0,1).toUpperCase()}</b>{p.name}<small>{t(p.area==='graph'?'nav_graph':`wb_${p.area}`)}</small></span>)}</div>;
}

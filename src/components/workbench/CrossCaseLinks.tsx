'use client';
import {useQuery} from '@tanstack/react-query';
import Link from 'next/link';
import {workspaceApi} from '../../lib/workspaceApi';
import {useAuthStore} from '../../store/authStore';
import {useT} from '../../lib/i18n';
import {QueryState} from './Shared';
export default function CrossCaseLinks({caseId}:{caseId:string}) {
 const t=useT(),user=useAuthStore(s=>s.user);const query=useQuery({queryKey:['cross-case',caseId,user?.id],queryFn:()=>workspaceApi.crossCase(caseId)});
 return <div className="wb-stack"><div className="wb-toolbar"><h2>{t('wb_cross_case')}</h2><button className="dashboard-secondary-button" disabled={query.isFetching} onClick={()=>void query.refetch()}>{t('pro_refresh')}</button></div><p className="wb-muted">{t('pro_cross_case_note')}</p><QueryState query={query} empty={!query.data?.items.length}/>{query.data&&!query.isError&&<><p className="wb-muted">{t('pro_checked_cases')}: {query.data.checked_cases}</p>{query.data.truncated&&<p role="status" className="wb-danger">{t('pro_cross_case_partial')}</p>}{query.data.items.map(item=><article className="pro-panel" key={`${item.case_id}:${item.from_id}:${item.to_id}`}><Link className="dashboard-text-link" href={`/workbench?case=${encodeURIComponent(item.case_id)}&tab=cross_case`}>{item.case_title}</Link><p><Link href={`/entity/${encodeURIComponent(item.from_id)}`}>{item.from_name}</Link> ↔ <Link href={`/entity/${encodeURIComponent(item.to_id)}`}>{item.to_name}</Link></p><ul>{item.reasons.map(r=><li key={r.field}>{r.field}: {r.value}</li>)}</ul></article>)}</>}</div>;
}

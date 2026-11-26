'use client';
import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { workspaceApi } from '../../lib/workspaceApi';
import { useAuthStore } from '../../store/authStore';
import { useT } from '../../lib/i18n';
import { QueryState } from './Shared';

export default function CaseAccess({ caseId }: { caseId: string }) {
	const t=useT();const user=useAuthStore(s=>s.user);
	const query=useQuery({queryKey:['case-access',caseId,user?.id],queryFn:()=>workspaceApi.access(caseId)});
	const d=query.data;
	return <section className="wb-stack"><h2 className="flex items-center gap-2"><ShieldCheck size={18}/> {t('wb_access')}</h2><p className="wb-muted">{t('wb_access_note')}</p><QueryState query={query}/>{d&&!query.isError&&<><div className="wb-evidence-card"><p>{t('wb_access_classification')}: <strong>{d.classification}</strong></p><p>{t('wb_access_clearance')}: <strong>{d.clearance}</strong></p><dl className="wb-form-grid">{(['read','write','review','export'] as const).map(action=><div key={action}><dt>{t(`wb_access_${action}`)}</dt><dd className={d[`can_${action}`]?'':'wb-danger'}>{t(d[`can_${action}`]?'wb_access_allowed':'wb_access_denied')}</dd></div>)}</dl>{d.project_id&&<Link href={`/projects/${encodeURIComponent(d.project_id)}`} className="dashboard-text-link">{t('wb_access_manage')}</Link>}</div><h3>{t('wb_access_members')}</h3><div className="pro-table-scroll"><table className="pro-table"><thead><tr><th>{t('wb_assignee')}</th><th>{t('wb_access_role')}</th></tr></thead><tbody>{d.participants.map(p=><tr key={p.id}><th>{p.name}</th><td>{p.role}</td></tr>)}</tbody></table></div></>}</section>;
}

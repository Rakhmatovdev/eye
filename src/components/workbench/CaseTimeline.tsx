'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Clock3, RefreshCw } from 'lucide-react';
import { workspaceApi, type TimelineKind } from '../../lib/workspaceApi';
import { useAuthStore } from '../../store/authStore';
import { useT } from '../../lib/i18n';
import { DateLabel, QueryState } from './Shared';

const kinds: TimelineKind[] = ['case', 'event', 'entity', 'evidence', 'file', 'comment', 'report', 'task'];
export default function CaseTimeline({ caseId }: { caseId: string }) {
	const t = useT(); const user = useAuthStore(s => s.user);
	const [kind, setKind] = useState('all'); const [page, setPage] = useState(1);
	const query = useQuery({ queryKey: ['case-timeline', caseId, user?.id, kind, page], queryFn: () => workspaceApi.timeline(caseId, kind, page), refetchInterval: 30_000 });
	const link = (item: { kind: TimelineKind; subject_id: string }) => {
		if (item.kind === 'entity') return `/entity/${encodeURIComponent(item.subject_id)}`;
		const tab = item.kind === 'evidence' || item.kind === 'file' ? 'evidence' : item.kind === 'comment' ? 'discussion' : item.kind === 'report' ? 'reports' : 'board';
		return `/workbench?case=${encodeURIComponent(caseId)}&tab=${tab}`;
	};
	return <section className="wb-stack"><div className="wb-toolbar"><div><h2 className="flex items-center gap-2"><Clock3 size={18} /> {t('wb_timeline')}</h2><p>{t('wb_timeline_note')}</p></div><button className="dashboard-secondary-button" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={15}/>{t('workspace_refresh')}</button></div>
		<label className="wb-form">{t('wb_timeline_filter')}<select value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="all">{t('wb_all')}</option>{kinds.map(k => <option key={k} value={k}>{t(`wb_timeline_${k}`)}</option>)}</select></label>
		<QueryState query={query} empty={!query.data?.items.length}/>
		{query.data && !query.isError && <><ol className="wb-stack" aria-label={t('wb_timeline')}>{query.data.items.map(item => <li className="wb-evidence-card" key={item.id}><header><span className="wb-badge">{t(`wb_timeline_${item.kind}`)}</span><DateLabel value={item.at}/></header><h3 className="wb-prose">{item.title}</h3>{item.source && <p className="wb-source"><strong>{t('wb_source')}</strong>{item.source}</p>}{item.actor_id && <p className="wb-muted">{t('wb_created_by')}: {item.actor_id}</p>}<Link className="dashboard-text-link" href={link(item)}>{t('wb_open')}</Link></li>)}</ol><div className="wb-filter-row"><button className="wb-chip" disabled={page === 1 || query.isFetching} onClick={() => setPage(p => p-1)}>{t('wb_previous_page')}</button><span>{page} / {Math.max(1, Math.ceil(query.data.total/30))} · {query.data.total}</span><button className="wb-chip" disabled={page*30 >= query.data.total || query.isFetching} onClick={() => setPage(p => p+1)}>{t('wb_next')}</button></div></>}
	</section>;
}

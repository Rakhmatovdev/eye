'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AtSign, BellRing, CheckCheck, Clock3, Inbox, RefreshCw } from 'lucide-react';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { DateLabel, ErrorMessage, QueryState } from '../../components/workbench/Shared';
import { workspaceApi } from '../../lib/workspaceApi';
import { notificationSnoozed } from '../../lib/workbench';
import { apiErrorMessage } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { useT } from '../../lib/i18n';
import NotificationChannels from '../../components/workbench/NotificationChannels';

export default function InboxPage() {
  const t = useT(); const user = useAuthStore(s => s.user); const authenticated = useAuthStore(s => s.isAuthenticated); const qc = useQueryClient();
  const query = useQuery({ queryKey: ['workspace-inbox', user?.id], queryFn: workspaceApi.notifications, enabled: authenticated, refetchInterval: 30_000 });
  const [filter, setFilter] = useState<'unread' | 'all' | 'snoozed'>('unread'); const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: ({ id, ...body }: { id: string; read?: boolean; snooze_hours?: number }) => workspaceApi.updateNotification(id, body), onSuccess: () => { setError(''); void qc.invalidateQueries({ queryKey: ['workspace-inbox'] }); }, onError: e => setError(apiErrorMessage(e, t('wb_error'))) });
  const notices = (query.data ?? []).filter(n => filter === 'all' || (filter === 'snoozed' ? notificationSnoozed(n) : !n.read && !notificationSnoozed(n)));
  return <WorkspaceLayout><div className="dashboard-page h-full overflow-y-auto"><div className="dashboard-container wb-container"><div className="dashboard-heading"><div><p className="dashboard-eyebrow">KO‘Z / {t('wb_inbox')}</p><h1>{t('wb_inbox')}</h1><p className="dashboard-welcome">{t('wb_inbox_note')}</p></div><button className="dashboard-secondary-button" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw size={15} />{t('workspace_refresh')}</button></div><div className="wb-filter-row" role="group" aria-label={t('wb_inbox')}>{(['unread', 'all', 'snoozed'] as const).map(f => <button key={f} className="wb-chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{t(`wb_${f}`)}</button>)}</div><ErrorMessage message={error} /><QueryState query={query} />
    <NotificationChannels />{!query.isPending && !query.isError && !notices.length && <div className="wb-empty wb-inbox-empty"><Inbox size={40} strokeWidth={1.1} /><h2>{t('wb_inbox_empty')}</h2><Link href="/workbench" className="dashboard-secondary-button">{t('wb_title')}</Link></div>}
    <div className="wb-inbox-list">{notices.map(n => { const Icon = n.kind === 'mention' ? AtSign : n.kind === 'review' ? CheckCheck : n.kind === 'overdue' ? BellRing : Clock3; return <article className={`wb-notification ${!n.read ? 'is-unread' : ''}`} key={n.id}><span className={`wb-notification-icon kind-${n.kind}`}><Icon size={20} /></span><div className="wb-notification-main"><header><span>{t(`wb_${n.kind}`)}</span><DateLabel value={n.created_at} /></header><h2>{n.title}</h2>{n.delivery_status === 'failed' && <p className="wb-error">{t('wb_delivery_failed')}</p>}{n.due_at && <p className="wb-muted">{t('workflow_due')}: <DateLabel value={n.due_at} /></p>}{notificationSnoozed(n) && <p className="wb-muted">{t('wb_snoozed')}: <DateLabel value={n.snoozed_until!} /></p>}<div className="wb-notification-actions"><Link href={n.kind === 'search_match' ? `/entity/${encodeURIComponent(n.subject_id)}` : `/workbench?case=${encodeURIComponent(n.case_id)}&tab=${n.kind.startsWith('analytics_') ? 'brief_analytics' : n.kind === 'mention' ? 'discussion' : 'board'}${n.kind === 'mention' ? `#comment-${encodeURIComponent(n.subject_id)}` : ''}`} className="dashboard-text-link">{t('wb_open')}</Link><button disabled={mutation.isPending} onClick={() => mutation.mutate({ id: n.id, read: !n.read })}>{t(n.read ? 'wb_mark_unread' : 'wb_mark_read')}</button><button disabled={mutation.isPending} onClick={() => mutation.mutate({ id: n.id, snooze_hours: notificationSnoozed(n) ? 0 : 1 })}>{t(notificationSnoozed(n) ? 'wb_unsnooze' : 'wb_snooze')}</button></div></div></article>; })}</div>
  </div></div></WorkspaceLayout>;
}

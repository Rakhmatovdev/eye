'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import DataBoundary from '../../components/common/DataBoundary';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { alertsApi, type Alert, type AlertSeverity } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { useT, type TKey } from '../../lib/i18n';
import { ShieldAlert, CheckCircle2, ExternalLink, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const SEVERITIES: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

const SEVERITY_KEY: Record<AlertSeverity, TKey> = {
  critical: 'alerts_severity_critical',
  high: 'alerts_severity_high',
  medium: 'alerts_severity_medium',
  low: 'alerts_severity_low',
};

const SEVERITY_STYLE: Record<AlertSeverity, string> = {
  critical: 'text-[var(--accent-red-soft)] border-red-500/40 bg-red-500/10',
  high: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  medium: 'text-[var(--accent-amber-soft)] border-amber-500/40 bg-amber-500/10',
  low: 'text-[var(--chrome-text-400)] border-[color-mix(in_srgb,var(--chrome-border-600)_40%,transparent)] bg-[color-mix(in_srgb,var(--chrome-bg-500)_10%,transparent)]',
};

const SEVERITY_BAR: Record<AlertSeverity, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-[var(--chrome-bg-500)]',
};

type Tab = 'all' | 'unacknowledged' | 'acknowledged';

export default function AlertsPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<Tab>('unacknowledged');
  const [severity, setSeverity] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [stateNote, setStateNote] = useState('');

  const acknowledged = tab === 'all' ? undefined : tab === 'acknowledged';

  const sourceQ = useQuery({
    queryKey: ['alerts', tab, severity, page],
    queryFn: () => alertsApi.list({ acknowledged, severity, page, limit: 10 }),
  });

  const { data, isLoading } = sourceQ;
  const alerts: Alert[] = data?.alerts ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const ackM = useMutation({
    mutationFn: (id: string) => alertsApi.ack(id),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
    },
    onError: (err) => setError(apiErrorMessage(err, t('alerts_ack_error'))),
  });

  const stateM = useMutation({
    mutationFn: ({ id, state }: { id: string; state: Alert['state'] }) => alertsApi.setState(id, state, stateNote),
    onSuccess: () => { setError(''); setStateNote(''); queryClient.invalidateQueries({ queryKey: ['alerts'] }); queryClient.invalidateQueries({ queryKey: ['alerts-unread-count'] }); queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] }); },
    onError: (err) => setError(apiErrorMessage(err, t('alerts_state_error'))),
  });
  const assignM = useMutation({
    mutationFn: (id: string) => alertsApi.assign(id, user?.id ?? ''),
    onSuccess: () => { setError(''); queryClient.invalidateQueries({ queryKey: ['alerts'] }); },
    onError: (err) => setError(apiErrorMessage(err, t('alerts_assign_error'))),
  });

  const changeTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  return (
    <WorkspaceLayout>
      <DataBoundary queries={[sourceQ]}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 h-full overflow-y-auto max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-wide text-[var(--chrome-text-white)] uppercase flex items-center gap-2">
              <ShieldAlert size={18} className="text-[var(--accent-cyan-soft)]" /> {t('alerts_title')}
            </h1>
            <p className="text-[var(--chrome-text-500)] text-xs font-mono mt-0.5">{t('alerts_subtitle')}</p>
          </div>
          
        </div>

        {/* Tabs + severity filter */}
        <div className="flex flex-wrap items-center gap-4 bg-[color-mix(in_srgb,var(--bg-card)_40%,transparent)] p-4 border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-2xl">
          <div className="flex items-center gap-1 bg-[color-mix(in_srgb,var(--bg-main)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-lg p-0.5">
            {(['unacknowledged', 'acknowledged', 'all'] as Tab[]).map((tb) => (
              <button
                key={tb}
                data-testid={`alerts-tab-${tb}`}
                onClick={() => changeTab(tb)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono uppercase tracking-wide transition-all ${
                  tab === tb ? 'bg-cyan-600/20 text-[var(--accent-cyan-soft)]' : 'text-[var(--chrome-text-500)] hover:text-[var(--chrome-text-300)]'
                }`}
              >
                {tb === 'unacknowledged' ? t('alerts_tab_unacknowledged') : tb === 'acknowledged' ? t('alerts_tab_acknowledged') : t('alerts_tab_all')}
              </button>
            ))}
          </div>

          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            className="bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-xl px-3 py-1.5 text-xs text-[var(--chrome-text-300)] focus:outline-none font-mono"
          >
            <option value="all">{t('alerts_severity_all')}</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{t(SEVERITY_KEY[s])}</option>
            ))}
          </select>

          <span className="text-[10px] font-mono text-[var(--chrome-text-600)] ml-auto">
            <span data-testid="alerts-total">{total}</span> {t('alerts_title').toLowerCase()}
          </span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-[var(--accent-red-soft)] px-4 py-2.5 rounded-xl text-xs font-semibold font-mono">
            {error}
          </div>
        )}

        <input value={stateNote} onChange={(e) => setStateNote(e.target.value)} maxLength={2000} placeholder={t('alerts_resolution_note')} className="w-full bg-[var(--bg-card)] border border-[var(--chrome-border-800)] rounded-xl px-3 py-2 text-xs font-mono" />

        {/* List */}
        <div className="space-y-2">
          {isLoading && !sourceQ.isError && (
            <p className="text-xs text-[var(--chrome-text-600)] font-mono text-center py-8">{t('common_loading')}</p>
          )}
          {alerts.map((a) => (
            <div
              key={a.id}
              data-testid="alert-row"
              data-acknowledged={a.acknowledged}
              className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-2xl p-4 flex items-start gap-3 hover:border-cyan-500/20 transition-all"
            >
              <span className={`w-1.5 self-stretch rounded-full shrink-0 ${SEVERITY_BAR[a.severity] || 'bg-[var(--chrome-bg-500)]'}`} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.low}`}>
                    {t(SEVERITY_KEY[a.severity] ?? 'alerts_severity_low')}
                  </span>
                  <span className="text-xxs font-mono text-[var(--chrome-text-600)]">{a.rule_name}</span>
                  <span className="text-xxs font-mono text-[var(--chrome-text-600)] ml-auto">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <span className="inline-flex text-[9px] uppercase tracking-wide rounded border border-[var(--chrome-border-800)] px-2 py-0.5 text-[var(--chrome-text-400)]">{t(`alerts_state_${a.state}` as 'alerts_state_new')}</span>
                <h3 className="text-sm font-bold text-[var(--chrome-text-200)] font-mono">{a.title}</h3>
                <p className="text-xs text-[var(--chrome-text-500)] font-mono leading-relaxed">{a.message}</p>
                {a.resolution_note && <p className="text-xs text-[var(--chrome-text-400)]">{t('alerts_resolution_note')}: {a.resolution_note}</p>}
                <div className="flex items-center gap-3 pt-1 text-xxs font-mono">
                  {a.entity_id && (
                    <Link href={`/entity/${a.entity_id}`} className="flex items-center gap-1 text-[var(--accent-cyan-soft)] hover:underline">
                      <ExternalLink size={11} /> {t('alerts_related_entity')}: {a.entity_id}
                    </Link>
                  )}
                  {a.acknowledged ? (
                    <span className="flex items-center gap-1 text-[var(--accent-emerald-soft)]">
                      <CheckCircle2 size={11} /> {t('alerts_acked_by_prefix')} {a.ack_by || '—'}
                    </span>
                  ) : (
                    <button
                      data-testid="alert-ack-btn"
                      onClick={() => ackM.mutate(a.id)}
                      disabled={ackM.isPending}
                      className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 text-[var(--accent-cyan-soft)] rounded-lg font-bold disabled:opacity-40 transition-all"
                    >
                      <CheckCircle2 size={11} /> {t('alerts_ack_btn')}
                    </button>
                  )}
                  {!['resolved', 'false_positive'].includes(a.state) && <>
                    {a.state !== 'investigating' && <button onClick={() => stateM.mutate({ id: a.id, state: 'investigating' })} disabled={stateM.isPending} className="px-2.5 py-1 border border-cyan-500/30 text-cyan-300 rounded-lg">{t('alerts_investigate')}</button>}
                    <button onClick={() => { if (!stateNote.trim()) { setError(t('alerts_note_required')); return; } stateM.mutate({ id: a.id, state: 'resolved' }); }} disabled={stateM.isPending} className="px-2.5 py-1 border border-emerald-500/30 text-emerald-300 rounded-lg">{t('alerts_resolve')}</button>
                    <button onClick={() => { if (!stateNote.trim()) { setError(t('alerts_note_required')); return; } stateM.mutate({ id: a.id, state: 'false_positive' }); }} disabled={stateM.isPending} className="px-2.5 py-1 border border-amber-500/30 text-amber-300 rounded-lg">{t('alerts_false_positive')}</button>
                  </>}
                  {(a.state === 'resolved' || a.state === 'false_positive') && <button onClick={() => { if (!stateNote.trim()) { setError(t('alerts_note_required')); return; } stateM.mutate({ id: a.id, state: 'investigating' }); }} disabled={stateM.isPending} className="px-2.5 py-1 border border-amber-500/30 text-amber-300 rounded-lg">{t('alerts_reopen')}</button>}
                  {!a.assigned_to && !['resolved', 'false_positive'].includes(a.state) && <button onClick={() => assignM.mutate(a.id)} disabled={assignM.isPending} className="px-2.5 py-1 border border-[var(--chrome-border-800)] rounded-lg">{t('alerts_take')}</button>}
                  {!!a.assigned_to && <span className="text-[10px] text-[var(--chrome-text-500)]">{t('alerts_assigned_to')}: {a.assigned_to.slice(0, 8)}</span>}
                </div>
                {!!a.history?.length && <details className="text-[10px] text-[var(--chrome-text-600)]"><summary className="cursor-pointer">{t('alerts_history')} ({a.history.length})</summary><ol className="mt-1 space-y-1">{a.history.map((event, i) => <li key={`${event.at}-${i}`}>{new Date(event.at).toLocaleString()} · {event.actor_id} · {event.action}{event.note ? ` — ${event.note}` : ''}</li>)}</ol></details>}
              </div>
            </div>
          ))}

          {!isLoading && alerts.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[var(--chrome-text-500)] gap-2 font-mono">
              <AlertCircle size={28} />
              <p className="text-xs">{t('alerts_no_alerts')}</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!sourceQ.isError && total > limit && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-[color-mix(in_srgb,var(--chrome-bg-800)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--chrome-bg-700)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-700)_60%,transparent)] text-[var(--chrome-text-300)] rounded-xl text-xxs font-bold font-mono disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={12} /> {t('alerts_prev')}
            </button>
            <span className="text-xxs font-mono text-[var(--chrome-text-500)]">
              {t('alerts_page_prefix')} {page} {t('alerts_of')} {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 bg-[color-mix(in_srgb,var(--chrome-bg-800)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--chrome-bg-700)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-700)_60%,transparent)] text-[var(--chrome-text-300)] rounded-xl text-xxs font-bold font-mono disabled:opacity-30 transition-all"
            >
              {t('alerts_next')} <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>
    </DataBoundary>
    </WorkspaceLayout>
  );
}

'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { alertsApi, type Alert, type AlertSeverity } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT, type TKey } from '../../lib/i18n';
import { mockAlerts } from '../../data/mockAlerts';
import { ShieldAlert, CheckCircle2, ExternalLink, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const SEVERITIES: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

const SEVERITY_KEY: Record<AlertSeverity, TKey> = {
  critical: 'alerts_severity_critical',
  high: 'alerts_severity_high',
  medium: 'alerts_severity_medium',
  low: 'alerts_severity_low',
};

const SEVERITY_STYLE: Record<AlertSeverity, string> = {
  critical: 'text-red-400 border-red-500/40 bg-red-500/10',
  high: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  medium: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  low: 'text-gray-400 border-gray-600/40 bg-gray-500/10',
};

const SEVERITY_BAR: Record<AlertSeverity, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-gray-500',
};

type Tab = 'all' | 'unacknowledged' | 'acknowledged';

export default function AlertsPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('unacknowledged');
  const [severity, setSeverity] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const acknowledged = tab === 'all' ? undefined : tab === 'acknowledged';

  const { data, isError, isLoading } = useQuery({
    queryKey: ['alerts', tab, severity, page],
    queryFn: () => alertsApi.list({ acknowledged, severity, page, limit: 10 }),
  });

  const usingFallback = isError;
  const alerts: Alert[] = usingFallback
    ? mockAlerts.filter((a) => {
        const matchesTab = tab === 'all' || (tab === 'acknowledged' ? a.acknowledged : !a.acknowledged);
        const matchesSeverity = severity === 'all' || a.severity === severity;
        return matchesTab && matchesSeverity;
      })
    : data?.alerts ?? [];
  const total = usingFallback ? alerts.length : data?.total ?? alerts.length;
  const limit = usingFallback ? alerts.length || 1 : data?.limit ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const ackM = useMutation({
    mutationFn: (id: string) => alertsApi.ack(id),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-unread-count'] });
    },
    onError: (err) => setError(apiErrorMessage(err, t('alerts_ack_error'))),
  });

  const changeTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  return (
    <WorkspaceLayout>
      <div className="p-8 space-y-6 h-full overflow-y-auto max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-wide text-white uppercase flex items-center gap-2">
              <ShieldAlert size={18} className="text-cyan-400" /> {t('alerts_title')}
            </h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">{t('alerts_subtitle')}</p>
          </div>
          {usingFallback && (
            <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-mono h-fit">
              {t('common_demo_data_badge')}
            </span>
          )}
        </div>

        {/* Tabs + severity filter */}
        <div className="flex flex-wrap items-center gap-4 bg-[#0c0e17]/40 p-4 border border-gray-800/60 rounded-2xl">
          <div className="flex items-center gap-1 bg-gray-950/60 border border-gray-800/60 rounded-lg p-0.5">
            {(['unacknowledged', 'acknowledged', 'all'] as Tab[]).map((tb) => (
              <button
                key={tb}
                data-testid={`alerts-tab-${tb}`}
                onClick={() => changeTab(tb)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono uppercase tracking-wide transition-all ${
                  tab === tb ? 'bg-cyan-600/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tb === 'unacknowledged' ? t('alerts_tab_unacknowledged') : tb === 'acknowledged' ? t('alerts_tab_acknowledged') : t('alerts_tab_all')}
              </button>
            ))}
          </div>

          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none font-mono"
          >
            <option value="all">{t('alerts_severity_all')}</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{t(SEVERITY_KEY[s])}</option>
            ))}
          </select>

          <span className="text-[10px] font-mono text-gray-600 ml-auto">
            <span data-testid="alerts-total">{total}</span> {t('alerts_title').toLowerCase()}
          </span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono">
            {error}
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {isLoading && !usingFallback && (
            <p className="text-xs text-gray-600 font-mono text-center py-8">{t('common_loading')}</p>
          )}
          {alerts.map((a) => (
            <div
              key={a.id}
              data-testid="alert-row"
              data-acknowledged={a.acknowledged}
              className="bg-[#0e1220]/60 border border-gray-800/60 rounded-2xl p-4 flex items-start gap-3 hover:border-cyan-500/20 transition-all"
            >
              <span className={`w-1.5 self-stretch rounded-full shrink-0 ${SEVERITY_BAR[a.severity] || 'bg-gray-500'}`} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.low}`}>
                    {t(SEVERITY_KEY[a.severity] ?? 'alerts_severity_low')}
                  </span>
                  <span className="text-xxs font-mono text-gray-600">{a.rule_name}</span>
                  <span className="text-xxs font-mono text-gray-600 ml-auto">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <h3 className="text-sm font-bold text-gray-200 font-mono">{a.title}</h3>
                <p className="text-xs text-gray-500 font-mono leading-relaxed">{a.message}</p>
                <div className="flex items-center gap-3 pt-1 text-xxs font-mono">
                  {a.entity_id && (
                    <Link href={`/entity/${a.entity_id}`} className="flex items-center gap-1 text-cyan-400 hover:underline">
                      <ExternalLink size={11} /> {t('alerts_related_entity')}: {a.entity_id}
                    </Link>
                  )}
                  {a.acknowledged ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 size={11} /> {t('alerts_acked_by_prefix')} {a.ack_by || '—'}
                    </span>
                  ) : (
                    <button
                      data-testid="alert-ack-btn"
                      onClick={() => ackM.mutate(a.id)}
                      disabled={ackM.isPending}
                      className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 rounded-lg font-bold disabled:opacity-40 transition-all"
                    >
                      <CheckCircle2 size={11} /> {t('alerts_ack_btn')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!isLoading && alerts.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500 gap-2 font-mono">
              <AlertCircle size={28} />
              <p className="text-xs">{t('alerts_no_alerts')}</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!usingFallback && total > limit && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/60 text-gray-300 rounded-xl text-xxs font-bold font-mono disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={12} /> {t('alerts_prev')}
            </button>
            <span className="text-xxs font-mono text-gray-500">
              {t('alerts_page_prefix')} {page} {t('alerts_of')} {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/60 text-gray-300 rounded-xl text-xxs font-bold font-mono disabled:opacity-30 transition-all"
            >
              {t('alerts_next')} <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}

'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, FolderOpen, FolderGit2, ShieldAlert, Search, RefreshCw, Sparkles, Network, Map, Clock, Bot, CheckCheck } from 'lucide-react';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import DashboardPreferences, { useDashboardPreferences, PinnedProjects } from '../../components/workbench/DashboardPreferences';
import { defaultPreferences } from '../../lib/workspaceApi';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useLocaleStore } from '../../store/localeStore';
import { useT } from '../../lib/i18n';
import { useHasMounted } from '../../lib/useHasMounted';
import { alertsApi, casesApi, projectsApi, patternsApi } from '../../lib/api';
import { scoreColorClass, PATTERN_TYPE_KEY, PATTERN_TYPE_ICON, PATTERN_FALLBACK_ICON } from '../../lib/patternUi';

export default function AnalystDashboard() {
  const t = useT();
  const locale = useLocaleStore(state => state.locale);
  const user = useAuthStore(state => state.user);
  const mounted = useHasMounted();
  const preferencesQuery = useDashboardPreferences();
  const preferences = preferencesQuery.data ?? defaultPreferences;
  const show = (widget: typeof preferences.widgets[number]) => preferences.widgets.includes(widget);
  const [caseFilter, setCaseFilter] = useState<'all' | 'priority' | 'progress'>('all');
  const setActiveCaseId = useWorkspaceStore(state => state.setActiveCaseId);
  const cases = useQuery({ queryKey: ['cases'], queryFn: () => casesApi.list() });
  const projects = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list() });
  const alerts = useQuery({ queryKey: ['dashboard-alerts'], queryFn: () => alertsApi.list({ acknowledged: false, limit: 5 }) });
  const patterns = useQuery({ queryKey: ['patterns'], queryFn: () => patternsApi.list() });
  const queries = [cases, projects, alerts, patterns];
  const refreshing = queries.some(query => query.isFetching);
  const failed = queries.some(query => query.isError);
  const updatedAt = Math.min(...queries.map(query => query.dataUpdatedAt));
  const activeCases = (cases.data ?? []).filter(item => item.status !== 'closed' && item.status !== 'archived');
  const priority = { critical: 4, high: 3, medium: 2, low: 1 };
  const filteredCases = activeCases.filter(item => caseFilter === 'all' || (caseFilter === 'priority'
    ? item.priority === 'critical' || item.priority === 'high' : item.status === 'in-progress'));
  const topCases = [...filteredCases].sort((a, b) => priority[b.priority] - priority[a.priority]).slice(0, 5);
  const topPatterns = [...(patterns.data ?? [])].sort((a, b) => b.score - a.score).slice(0, 4);
  const refresh = () => { queries.forEach(query => { void query.refetch(); }); };
  const stats = [
    { label: t('workspace_active_cases'), value: cases.isError ? '—' : cases.isPending ? '…' : activeCases.length, icon: FolderOpen, href: '/cases', note: t('workspace_open_cases'), tone: 'gold' },
    { label: t('nav_projects'), value: projects.isError ? '—' : projects.isPending ? '…' : projects.data.length, icon: FolderGit2, href: '/projects', note: t('workspace_project_note'), tone: 'blue' },
    { label: t('nav_alerts'), value: alerts.isError ? '—' : alerts.isPending ? '…' : alerts.data.total, icon: ShieldAlert, href: '/alerts', note: t('workspace_alert_note'), tone: 'rose' },
    { label: t('nav_patterns'), value: patterns.isError ? '—' : patterns.isPending ? '…' : patterns.data.length, icon: Sparkles, href: '/patterns', note: t('workspace_patterns_note'), tone: 'violet' },
  ];
  const tools = [
    { href: '/map', icon: Map, title: t('nav_map'), note: t('workspace_map_note') },
    { href: '/timeline', icon: Clock, title: t('nav_timeline'), note: t('workspace_timeline_note') },
    { href: '/assistant', icon: Bot, title: t('nav_assistant'), note: t('workspace_assistant_note') },
  ];
  const state = (query: { isPending: boolean; isError: boolean; refetch: () => unknown }, empty: boolean, kind: 'cases' | 'alerts' | 'patterns') => {
    if (query.isPending) return <div role="status" className="space-y-3 p-5"><span className="sr-only">{t('common_loading')}</span>{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-[var(--bg-elevated)] animate-pulse" />)}</div>;
    if (query.isError) return <div role="alert" className="dashboard-empty"><ShieldAlert size={25} /><p>{t('common_load_error')}</p><button onClick={() => query.refetch()} className="dashboard-secondary-button"><RefreshCw size={14} />{t('common_retry')}</button></div>;
    if (empty) {
      const Icon = kind === 'alerts' ? CheckCheck : kind === 'patterns' ? Network : FolderOpen;
      return <div className="dashboard-empty"><span className="dashboard-empty-icon"><Icon size={25} strokeWidth={1.5} /></span><div><h3>{t(`workspace_${kind}_empty`)}</h3><p>{t(`workspace_${kind}_empty_note`)}</p></div>{kind !== 'alerts' && <Link href={`/${kind}`} className="dashboard-text-link">{t(kind === 'cases' ? 'nav_cases' : 'nav_patterns')}<ArrowRight size={14} /></Link>}</div>;
    }
    return null;
  };

  return <WorkspaceLayout>
    <div className="dashboard-page h-full overflow-y-auto">
      <div className="dashboard-container">
        <div className="dashboard-heading">
          <div><p className="dashboard-eyebrow">{t('workspace_briefing')}</p><h1>{t('workspace_overview')}</h1><p className="dashboard-welcome">{t('workspace_greeting')}{mounted && user?.name ? `, ${user.name.split(' ')[0]}` : ''}<span className="dashboard-welcome-divider">/</span>{t('workspace_ready')}</p></div>
          <div className="dashboard-heading-actions">
            <DashboardPreferences preferences={preferences} projects={projects.data ?? []} disabled={preferencesQuery.isPending || preferencesQuery.isError || projects.isPending || projects.isError} />
            <div className={`dashboard-sync ${failed ? 'has-error' : ''}`} aria-live="polite">
              <span className="dashboard-sync-dot" />
              {failed ? t('workspace_partial') : refreshing ? t('workspace_updating') : mounted && updatedAt > 0 ? <>{t('workspace_updated')} <time dateTime={new Date(updatedAt).toISOString()}>{new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(updatedAt)}</time></> : t('common_loading')}
            </div>
            <button onClick={refresh} disabled={refreshing} className="dashboard-secondary-button"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />{t('workspace_refresh')}</button>
          </div>
        </div>

        {preferencesQuery.isError && <p role="alert" className="wb-muted">{t('wb_preferences_error')} <button className="dashboard-text-link" onClick={() => preferencesQuery.refetch()}>{t('common_retry')}</button></p>}
        <PinnedProjects preferences={preferences} projects={projects.data ?? []} />
        {show('stats') && <div className="dashboard-stats">{stats.map(stat => <Link key={stat.href} href={stat.href} className={`dashboard-stat tone-${stat.tone}`}>
          <div className="dashboard-stat-top"><span className="dashboard-stat-icon"><stat.icon size={18} strokeWidth={1.7} /></span><ArrowUpRight size={16} className="dashboard-stat-arrow" /></div>
          <p className="dashboard-stat-label">{stat.label}</p><p className="dashboard-stat-value">{stat.value}</p><p className="dashboard-stat-note">{stat.note}</p>
        </Link>)}</div>}

        <section className="dashboard-search-banner">
          <span className="dashboard-search-symbol" aria-hidden="true"><Network size={26} strokeWidth={1.4} /></span>
          <div><h2>{t('workspace_search_title')}</h2><p>{t('workspace_search_note')}</p></div>
          <Link href="/search" className="dashboard-primary-button"><Search size={16} />{t('dashboard_search_registry')}<ArrowRight size={15} /></Link>
        </section>

        <div className={`dashboard-main-grid ${!show('cases') || !show('alerts') ? 'wb-single-column' : ''}`}>
          {show('cases') && <section className="dashboard-panel">
            <div className="dashboard-panel-heading"><div><h2><FolderOpen size={17} />{t('workspace_active_cases')}{!cases.isPending && !cases.isError && <span className="dashboard-count">{activeCases.length}</span>}</h2><p>{t('workspace_priority_note')}</p></div><Link href="/cases" className="dashboard-text-link">{t('workspace_view_all')}<ArrowUpRight size={14} /></Link></div>
            <div className="dashboard-case-filters" role="group" aria-label={t('workspace_case_filters')}>
              {(['all', 'priority', 'progress'] as const).map(filter => <button key={filter} type="button" aria-pressed={caseFilter === filter} onClick={() => setCaseFilter(filter)}>{t(`workspace_filter_${filter}`)}</button>)}
            </div>
            {state(cases, !activeCases.length, 'cases') || (!topCases.length ? <div className="dashboard-empty"><FolderOpen size={25} /><h3>{t('workspace_filter_empty')}</h3><button className="dashboard-secondary-button" onClick={() => setCaseFilter('all')}>{t('workspace_show_all')}</button></div> : <div>
              <div className="dashboard-case-columns"><span>{t('workspace_case_column')}</span><span>{t('workspace_priority_column')}</span></div>
              {topCases.map(item => <Link key={item.id} href={`/graph/${encodeURIComponent(item.id)}`} onClick={() => setActiveCaseId(item.id)} className="dashboard-case-row">
                <span className="dashboard-row-icon"><FolderOpen size={17} strokeWidth={1.6} /></span>
                <div className="min-w-0 flex-1"><h3>{item.title}</h3><p>{item.assignee && item.assignee !== 'unassigned' ? item.assignee : t('workspace_unassigned')}<span>·</span>{t(item.status === 'in-progress' ? 'cases_status_in_progress' : 'cases_status_open')}</p></div>
                <span className={`dashboard-priority priority-${item.priority}`}><span />{t(`workspace_priority_${item.priority}`)}</span><ArrowUpRight size={15} className="dashboard-row-arrow" />
              </Link>)}
            </div>)}
          </section>}
          {show('alerts') && <section className="dashboard-panel">
            <div className="dashboard-panel-heading"><div><h2><ShieldAlert size={17} />{t('nav_alerts')}</h2><p>{t('workspace_alert_note')}</p></div><Link href="/alerts" className="dashboard-text-link">{t('workspace_view_all')}<ArrowUpRight size={14} /></Link></div>
            {state(alerts, !alerts.data?.alerts.length, 'alerts') || <div className="dashboard-alert-list">{alerts.data?.alerts.map(item => <Link key={item.id} href="/alerts" className="dashboard-alert-row">
              <span className={`dashboard-alert-dot priority-${item.severity}`} />
              <div className="min-w-0 flex-1"><h3>{item.title}</h3><p>{item.message}</p><span className={`dashboard-alert-severity priority-${item.severity}`}>{t(`workspace_priority_${item.severity}`)}</span></div><ArrowUpRight size={14} className="dashboard-row-arrow" />
            </Link>)}</div>}
          </section>}
        </div>

        {show('patterns') && <section className="dashboard-panel">
          <div className="dashboard-panel-heading"><div><h2><Sparkles size={17} />{t('patterns_dashboard_card_title')}</h2><p>{t('workspace_patterns_note')}</p></div><Link href="/patterns" className="dashboard-text-link">{t('workspace_view_all')}<ArrowUpRight size={14} /></Link></div>
          {state(patterns, !topPatterns.length, 'patterns') || <div className="dashboard-pattern-grid">{topPatterns.map(item => {
            const Icon = PATTERN_TYPE_ICON[item.type] || PATTERN_FALLBACK_ICON;
            return <Link href="/patterns" key={item.id} className="dashboard-pattern-card"><div className="dashboard-pattern-top"><Icon size={18} strokeWidth={1.6} /><span>{t(PATTERN_TYPE_KEY[item.type] || 'nav_patterns')}</span><ArrowUpRight size={14} /></div><h3>{item.title}</h3><div className="dashboard-pattern-score"><span>{t('workspace_pattern_score')}</span><strong className={scoreColorClass(item.score)}>{item.score}<small>/100</small></strong></div><div className="dashboard-score-track"><span className={scoreColorClass(item.score)} style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }} /></div></Link>;
          })}</div>}
        </section>}

        {show('tools') && <section className="dashboard-tools"><h2 className="dashboard-eyebrow">{t('workspace_tools')}</h2><div>{tools.map(tool => <Link href={tool.href} key={tool.href} className="dashboard-tool"><tool.icon size={20} strokeWidth={1.5} /><span><strong>{tool.title}</strong><small>{tool.note}</small></span><ArrowUpRight size={16} /></Link>)}</div></section>}
        <footer className="dashboard-footer"><span>KO‘Z <span>/</span> {t('workspace_brand_caption')}</span><span>{t('workspace_group_analysis')} · {t('workspace_group_operations')}</span></footer>
      </div>
    </div>
  </WorkspaceLayout>;
}

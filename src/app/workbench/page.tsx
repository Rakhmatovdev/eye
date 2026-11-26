'use client';
import React, { Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Columns3, FileCheck2, Files, MessageSquare, ArrowUpRight, FolderOpen, BrainCircuit, Activity, Compass, Sparkles, ShieldAlert } from 'lucide-react';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import CasePresence from '../../components/workbench/CasePresence';
import { EntityComparison, ChangeTracking, TeamWorkload } from '../../components/workbench/ComparisonTools';
import { QueryState } from '../../components/workbench/Shared';
import { casesApi } from '../../lib/api';
import { workspaceApi } from '../../lib/workspaceApi';
import { useAuthStore } from '../../store/authStore';
import { useT } from '../../lib/i18n';

const LoadingTab = () => (
  <div className="wb-tab-loading flex items-center justify-center p-12 text-slate-400 text-xs font-mono animate-pulse">
    <span>Yuklanmoqda...</span>
  </div>
);

// High-Performance Dynamic Code Splitting (On-Demand Loading)
const TaskBoard = dynamic(() => import('../../components/workbench/TaskBoard'), { loading: LoadingTab });
const EvidenceCenter = dynamic(() => import('../../components/workbench/EvidenceCenter'), { loading: LoadingTab });
const ReportVersions = dynamic(() => import('../../components/workbench/ReportVersions'), { loading: LoadingTab });
const Discussion = dynamic(() => import('../../components/workbench/Discussion'), { loading: LoadingTab });
const CaseAnalysis = dynamic(() => import('../../components/workbench/CaseAnalysis'), { loading: LoadingTab });
const BriefAnalytics = dynamic(() => import('../../components/workbench/BriefAnalytics'), { loading: LoadingTab });
const ResearchTools = dynamic(() => import('../../components/workbench/ResearchTools'), { loading: LoadingTab });
const CaseTimeline = dynamic(() => import('../../components/workbench/CaseTimeline'), { loading: LoadingTab });
const CaseAccess = dynamic(() => import('../../components/workbench/CaseAccess'), { loading: LoadingTab });
const CaseOperations = dynamic(() => import('../../components/workbench/CaseOperations'), { loading: LoadingTab });
const CaseDiagnostics = dynamic(() => import('../../components/workbench/CaseDiagnostics'), { loading: LoadingTab });
const ACHMatrixComponent = dynamic(() => import('../../components/workbench/ACHMatrix'), { loading: LoadingTab });
const AgentProposals = dynamic(() => import('../../components/workbench/AgentProposals'), { loading: LoadingTab });
const CoTravelAnalysis = dynamic(() => import('../../components/workbench/CoTravelAnalysis'), { loading: LoadingTab });
const SpecialOpsCenter = dynamic(() => import('../../components/workbench/SpecialOpsCenter'), { loading: LoadingTab });
const CrossCaseLinks = dynamic(() => import('../../components/workbench/CrossCaseLinks'), { loading: LoadingTab });

const tabs = [{ id: 'brief_analytics', icon: Activity }, { id: 'special_ops', icon: ShieldAlert }, { id: 'ach', icon: BrainCircuit }, { id: 'ai_agents', icon: Sparkles }, { id: 'co_travel', icon: Compass }, { id: 'operations', icon: FileCheck2 }, { id: 'diagnostics', icon: FileCheck2 }, { id: 'access', icon: FileCheck2 }, { id: 'timeline', icon: FileCheck2 }, { id: 'board', icon: Columns3 }, { id: 'templates', icon: Files }, { id: 'evidence', icon: FileCheck2 }, { id: 'canvas', icon: Columns3 }, { id: 'hypotheses', icon: BrainCircuit }, { id: 'compare_entities', icon: Files }, { id: 'changes', icon: FileCheck2 }, { id: 'cross_case', icon: Files }, { id: 'workload', icon: Columns3 }, { id: 'reports', icon: Files }, { id: 'analysis', icon: BrainCircuit }, { id: 'discussion', icon: MessageSquare }] as const;
function WorkbenchContent() {
  const t = useT(); const user = useAuthStore(s => s.user); const authenticated = useAuthStore(s => s.isAuthenticated); const router = useRouter(); const params = useSearchParams();
  const cases = useQuery({ queryKey: ['cases', user?.id], queryFn: () => casesApi.list(), enabled: authenticated });
  const caseId = params.get('case') || cases.data?.[0]?.id || '';
  const activeCase = cases.data?.find(c => c.id === caseId);
  const tab = tabs.find(tab => tab.id === params.get('tab'))?.id ?? 'board';
  const context = useQuery({ queryKey: ['case-workspace', caseId, user?.id], queryFn: () => workspaceApi.context(caseId), enabled: !!activeCase && authenticated });
  const navigate = (id: string, nextTab = tab) => router.replace(`/workbench?case=${encodeURIComponent(id)}&tab=${nextTab}`, { scroll: false });
  return <div className="dashboard-page h-full overflow-y-auto"><div className="dashboard-container wb-container"><div className="dashboard-heading"><div><p className="dashboard-eyebrow">KO‘Z / {t('workspace_group_workspace')}</p><h1>{t('wb_title')}</h1><p className="dashboard-welcome">{t('wb_subtitle')}</p></div><Link className="dashboard-secondary-button" href="/inbox">{t('wb_inbox')}<ArrowUpRight size={15} /></Link></div>
    <QueryState query={cases} />{!cases.isPending && !cases.isError && !cases.data?.length && <div className="wb-empty"><FolderOpen size={32} /><h2>{t('wb_no_cases')}</h2><Link href="/cases" className="dashboard-primary-button">{t('nav_cases')}</Link></div>}
    {!!cases.data?.length && <><div className="wb-case-bar"><label><FolderOpen size={17} /><span>{t('wb_select_case')}</span><select aria-label={t('wb_select_case')} value={activeCase ? caseId : ''} onChange={e => navigate(e.target.value)}>{!activeCase && <option value="">{t('wb_select_case')}</option>}{cases.data.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>{activeCase && <Link className="dashboard-text-link" href={`/graph/${encodeURIComponent(caseId)}`}>{t('nav_graph')}<ArrowUpRight size={14} /></Link>}</div>
      {activeCase && <><nav className="wb-tabs" aria-label={t('wb_title')}>{tabs.map(item => <Link key={item.id} href={`/workbench?case=${encodeURIComponent(caseId)}&tab=${item.id}`} scroll={false} aria-current={tab === item.id ? 'page' : undefined}><item.icon size={16} />{t(`wb_${item.id}`)}</Link>)}</nav><QueryState query={context} />{context.data && !context.isError && <div key={`${caseId}-${tab}`} className="wb-tab-content">{!context.data.can_write && <p className="wb-readonly">{t('wb_readonly')}</p>}<CasePresence caseId={caseId} area={['templates','canvas','hypotheses'].includes(tab)?'research':['access','timeline','compare_entities','changes','cross_case','workload','analysis','brief_analytics'].includes(tab)?'operations':tab}/>{tab === 'operations' && <CaseOperations caseId={caseId} context={context.data}/>}{tab === 'diagnostics' && <CaseDiagnostics caseId={caseId} context={context.data} />}{tab === 'access' && <CaseAccess caseId={caseId} />}{tab === 'timeline' && <CaseTimeline caseId={caseId} />}{tab === 'board' && <TaskBoard caseId={caseId} context={context.data} />}{tab === 'evidence' && <EvidenceCenter caseId={caseId} context={context.data} />}{tab === 'reports' && <ReportVersions caseId={caseId} context={context.data} />}{tab === 'analysis' && <CaseAnalysis caseId={caseId} />}{tab === 'brief_analytics' && <BriefAnalytics caseId={caseId} context={context.data} />}{tab === 'special_ops' && <SpecialOpsCenter caseId={caseId} context={context.data} />}{tab === 'ach' && <ACHMatrixComponent caseId={caseId} context={context.data} />}{tab === 'ai_agents' && <AgentProposals caseId={caseId} context={context.data} />}{tab === 'co_travel' && <CoTravelAnalysis caseId={caseId} context={context.data} />}{(tab === 'templates' || tab === 'canvas' || tab === 'hypotheses') && <ResearchTools caseId={caseId} context={context.data} mode={tab} />}{tab === 'compare_entities' && <EntityComparison caseId={caseId} />}{tab === 'cross_case' && <CrossCaseLinks caseId={caseId} />}{tab === 'changes' && <ChangeTracking caseId={caseId} context={context.data} />}{tab === 'workload' && <TeamWorkload />}{tab === 'discussion' && <Discussion caseId={caseId} context={context.data} />}</div>}</>}
    </>}
  </div></div>;
}
export default function WorkbenchPage() { return <WorkspaceLayout><Suspense fallback={<div className="wb-empty" role="status">…</div>}><WorkbenchContent /></Suspense></WorkspaceLayout>; }

'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Pin, SlidersHorizontal } from 'lucide-react';
import type { Project } from '../../lib/api';
import { defaultPreferences, workspaceApi, type Widget, type WorkspacePreferences } from '../../lib/workspaceApi';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT, type TKey } from '../../lib/i18n';
import { useAuthStore } from '../../store/authStore';
import Modal from '../common/Modal';
import { ErrorMessage } from './Shared';

export const widgetLabels: Record<Widget, TKey> = { stats: 'wb_stats', cases: 'workspace_active_cases', alerts: 'nav_alerts', patterns: 'nav_patterns', tools: 'workspace_tools' };
export function useDashboardPreferences() {
  const user = useAuthStore(s => s.user); const authenticated = useAuthStore(s => s.isAuthenticated);
  return useQuery({ queryKey: ['workspace-preferences', user?.id], queryFn: workspaceApi.preferences, enabled: authenticated });
}
export function PinnedProjects({ preferences, projects }: { preferences: WorkspacePreferences; projects: Project[] }) {
  const t = useT(); const pinned = preferences.pinned_project_ids.map(id => projects.find(p => p.id === id)).filter((p): p is Project => !!p);
  if (!pinned.length) return null;
  return <section className="wb-pins"><h2><Pin size={14} />{t('wb_pinned')}</h2><div>{pinned.map(p => <Link key={p.id} href={`/projects/${encodeURIComponent(p.id)}`}><span>{p.title}</span><ArrowUpRight size={14} /></Link>)}</div></section>;
}
export default function DashboardPreferences({ preferences, projects, disabled }: { preferences: WorkspacePreferences; projects: Project[]; disabled: boolean }) {
  const t = useT(); const [open, setOpen] = useState(false);
  return <><button className="dashboard-secondary-button" disabled={disabled} onClick={() => setOpen(true)}><SlidersHorizontal size={15} />{t('wb_customize')}</button>{open && <PreferencesForm preferences={preferences} projects={projects} onClose={() => setOpen(false)} />}</>;
}
function PreferencesForm({ preferences, projects, onClose }: { preferences: WorkspacePreferences; projects: Project[]; onClose: () => void }) {
  const t = useT(); const user = useAuthStore(s => s.user); const qc = useQueryClient(); const [value, setValue] = useState<WorkspacePreferences>({ ...preferences, pinned_project_ids: preferences.pinned_project_ids.filter(id => projects.some(p => p.id === id)) }); const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: () => workspaceApi.savePreferences(value), onSuccess: p => { qc.setQueryData(['workspace-preferences', user?.id], p); onClose(); }, onError: e => setError(apiErrorMessage(e, t('wb_error'))) });
  return <Modal title={t('wb_customize')} onClose={onClose} busy={mutation.isPending}><form className="wb-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}><fieldset className="wb-checks"><legend>{t('wb_widgets')}</legend>{defaultPreferences.widgets.map(w => <label key={w}><input type="checkbox" checked={value.widgets.includes(w)} onChange={e => setValue(prev => ({ ...prev, widgets: e.target.checked ? [...prev.widgets, w] : prev.widgets.filter(id => id !== w) }))} />{t(widgetLabels[w])}</label>)}</fieldset><fieldset className="wb-checks"><legend>{t('wb_pinned')}</legend><p className="wb-muted">{t('wb_pin_note')}</p>{projects.map(p => <label key={p.id}><input type="checkbox" checked={value.pinned_project_ids.includes(p.id)} disabled={!value.pinned_project_ids.includes(p.id) && value.pinned_project_ids.length >= 20} onChange={e => setValue(prev => ({ ...prev, pinned_project_ids: e.target.checked ? [...prev.pinned_project_ids, p.id] : prev.pinned_project_ids.filter(id => id !== p.id) }))} /><span>{p.title}</span></label>)}</fieldset><ErrorMessage message={error} /><button className="dashboard-primary-button" disabled={mutation.isPending}>{mutation.isPending ? t('common_loading') : t('wb_save')}</button></form></Modal>;
}

'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, FolderGit2, Plus, Search, RefreshCw, Trash2, Clock, X, Loader2 } from 'lucide-react';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';
import { projectsApi, type Project } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import { useLocaleStore } from '../../store/localeStore';
import { useAuthStore } from '../../store/authStore';

export default function ProjectsPage() {
  const t = useT();
  const router = useRouter();
  const locale = useLocaleStore(state => state.locale);
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list() });
  const projects = query.data ?? [];
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const searchTerm = search.trim().toLocaleLowerCase(locale);
  const visible = projects.filter(project => (status === 'all' || project.status === status)
    && `${project.title} ${project.description || ''}`.toLocaleLowerCase(locale).includes(searchTerm))
    .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title, locale)
      : ((Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0)) || a.title.localeCompare(b.title, locale));
  const startCreate = () => { setError(''); setShowCreate(true); };
  const clearFilters = () => { setSearch(''); setStatus('all'); };
  const create = useMutation({
    mutationFn: (input: { title: string; description: string }) => projectsApi.create(input),
    onSuccess: project => { setError(''); setShowCreate(false); router.push('/projects/' + encodeURIComponent(project.id)); void queryClient.invalidateQueries({ queryKey: ['projects'] }); },
    onError: err => setError(apiErrorMessage(err, t('projects_create_error'))),
  });
  const remove = useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => { setError(''); setDeleteTarget(null); void queryClient.invalidateQueries({ queryKey: ['projects'] }); },
    onError: err => { setError(apiErrorMessage(err, t('projects_delete_error'))); setDeleteTarget(null); },
  });

  return <WorkspaceLayout>
    <div className="collection-page h-full overflow-y-auto"><div className="dashboard-container">
      <div className="dashboard-heading">
        <div><p className="dashboard-eyebrow">{t('workspace_group_workspace')}</p><h1>{t('nav_projects')}</h1><p className="collection-subtitle">{t('projects_subtitle')}</p></div>
        <div className="collection-header-actions"><button className="dashboard-secondary-button" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw size={14} className={query.isFetching ? 'animate-spin' : ''} />{t('workspace_refresh')}</button><button className="dashboard-primary-button" onClick={startCreate}><Plus size={16} />{t('projects_new_btn')}</button></div>
      </div>
      <div className="collection-toolbar">
        <div className="collection-search"><Search size={17} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label={t('projects_search')} placeholder={t('projects_search')} />{search && <button type="button" className="workspace-icon-button" onClick={() => setSearch('')} aria-label={t('search_reset')}><X size={15} /></button>}</div>
        <select className="collection-select" aria-label={t('projects_filter_status')} value={status} onChange={event => setStatus(event.target.value)}><option value="all">{t('projects_filter_all')}</option><option value="active">{t('projects_status_active')}</option><option value="archived">{t('projects_status_archived')}</option></select>
        <select className="collection-select" aria-label={t('projects_sort')} value={sort} onChange={event => setSort(event.target.value)}><option value="recent">{t('projects_sort_recent')}</option><option value="name">{t('projects_sort_name')}</option></select>
      </div>
      {error && !showCreate && <p role="alert" className="collection-error">{error}</p>}
      {query.isPending ? <div role="status" className="project-grid"><span className="sr-only">{t('common_loading')}</span>{[1, 2, 3, 4].map(id => <div key={id} className="project-skeleton animate-pulse" />)}</div>
        : query.isError ? <div role="alert" className="collection-empty"><FolderGit2 size={28} /><h2>{t('common_load_error')}</h2><button className="dashboard-secondary-button" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw size={14} />{t('common_retry')}</button></div>
        : <>
          <div className="collection-result-count" aria-live="polite">{visible.length} {t('projects_count_suffix')}</div>
          {visible.length ? <div className="project-grid">{visible.map(project => {
            const timestamp = Date.parse(project.updated_at);
            const canManage = user?.role === 'admin' || (!!user?.id && project.owner_id === user.id);
            return <article className="project-card" key={project.id}>
              <div className="project-card-top"><span className="project-card-icon"><FolderGit2 size={23} strokeWidth={1.5} /></span><span className={`project-status ${project.status === 'active' ? 'is-active' : ''}`}><span />{t(project.status === 'active' ? 'projects_status_active' : 'projects_status_archived')}</span>
                {canManage && <button type="button" onClick={() => { setError(''); setDeleteTarget(project); }} className="workspace-icon-button project-delete" aria-label={`${t('common_delete')}: ${project.title}`}><Trash2 size={15} /></button>}
              </div>
              <h2><Link href={`/projects/${encodeURIComponent(project.id)}`}>{project.title}</Link></h2><p className="project-description">{project.description || t('projects_no_description')}</p>
              <div className="project-card-footer"><span>{Number.isFinite(timestamp) && <><Clock size={13} /><time dateTime={new Date(timestamp).toISOString()} title={t('projects_updated')}>{new Intl.DateTimeFormat(locale, { year: 'numeric', month: locale === 'uz' ? '2-digit' : 'short', day: 'numeric', timeZone: 'UTC' }).format(timestamp)}</time></>}</span><Link href={`/projects/${encodeURIComponent(project.id)}`} aria-label={`${t('projects_open')}: ${project.title}`} className="dashboard-text-link">{t('projects_open')}<ArrowUpRight size={14} /></Link></div>
            </article>;
          })}</div> : <div className="collection-empty"><span className="collection-empty-icon">{projects.length ? <Search size={28} /> : <FolderGit2 size={28} />}</span><h2>{t(projects.length ? 'projects_no_matches' : 'projects_no_projects')}</h2><p>{t(projects.length ? 'projects_no_matches_note' : 'projects_empty_note')}</p>
            {projects.length ? <button className="dashboard-secondary-button" onClick={clearFilters}>{t('search_reset')}</button> : <button className="dashboard-primary-button" onClick={startCreate}><Plus size={16} />{t('projects_create_title')}</button>}
          </div>}
        </>}
    </div></div>
    {showCreate && <CreateProjectModal error={error} isPending={create.isPending} onCancel={() => { if (!create.isPending) { setShowCreate(false); setError(''); } }} onCreate={input => create.mutate(input)} />}
    {deleteTarget && <ConfirmDialog title={t('projects_delete_title')} message={`${t('projects_delete_message_prefix')}${deleteTarget.title}${t('projects_delete_message_suffix')}`} isPending={remove.isPending} onCancel={() => setDeleteTarget(null)} onConfirm={() => remove.mutate(deleteTarget.id)} />}
  </WorkspaceLayout>;
}

function CreateProjectModal({ error, isPending, onCancel, onCreate }: { error: string; isPending: boolean; onCancel: () => void; onCreate: (input: { title: string; description: string }) => void }) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  return <Modal title={t('projects_create_title')} onClose={onCancel} busy={isPending}>
    <p className="workspace-modal-description">{t('projects_empty_note')}</p>
    <form onSubmit={event => { event.preventDefault(); if (title.trim() && !isPending) onCreate({ title: title.trim(), description: description.trim() }); }}>
      {error && <p role="alert" className="collection-error">{error}</p>}
      <div className="workspace-form-field"><label htmlFor="project-title">{t('projects_field_title')}</label><input id="project-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={200} required disabled={isPending} placeholder={t('projects_title_hint')} className="nexus-input" /><span className="workspace-field-counter">{title.length}/200</span></div>
      <div className="workspace-form-field"><label htmlFor="project-description">{t('projects_field_description')} <span>{t('projects_optional')}</span></label><textarea id="project-description" value={description} onChange={event => setDescription(event.target.value)} rows={4} disabled={isPending} placeholder={t('projects_description_hint')} className="nexus-input" /></div>
      <div className="workspace-modal-actions"><button type="button" data-modal-cancel onClick={onCancel} disabled={isPending} className="dashboard-secondary-button">{t('common_cancel')}</button><button type="submit" disabled={isPending || !title.trim()} className="dashboard-primary-button">{isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{t(isPending ? 'common_saving' : 'common_save')}</button></div>
    </form>
  </Modal>;
}
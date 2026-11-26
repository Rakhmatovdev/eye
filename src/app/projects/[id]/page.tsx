'use client';
import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { projectsApi, casesApi, type ProjectCaseSummary, type ProjectMember } from '../../../lib/api';
import { apiErrorMessage } from '../../../lib/apiClient';
import { useT } from '../../../lib/i18n';
import { ArrowLeft, FolderGit2, Trash2, Plus, X, Share2, Archive, RotateCcw } from 'lucide-react';

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'text-[var(--accent-red-soft)] border-red-500/40 bg-red-500/10',
  high: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  medium: 'text-[var(--accent-amber-soft)] border-amber-500/40 bg-amber-500/10',
  low: 'text-[var(--chrome-text-400)] border-[color-mix(in_srgb,var(--chrome-border-600)_40%,transparent)] bg-[color-mix(in_srgb,var(--chrome-bg-500)_10%,transparent)]',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useT();
  const id = String(params.id);

  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddCase, setShowAddCase] = useState(false);
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<ProjectMember['role']>('analyst');

  const projectQ = useQuery({ queryKey: ['project', id], queryFn: () => projectsApi.get(id) });
  const casesQ = useQuery({ queryKey: ['project-cases', id], queryFn: () => projectsApi.cases(id) });
  const membersQ = useQuery({ queryKey: ['project-members', id], queryFn: () => projectsApi.members(id), retry: false });
  const canManage = projectQ.data?.my_role === 'owner' || projectQ.data?.my_role === 'admin';
  const candidatesQ = useQuery({
    queryKey: ['project-member-candidates', id, memberUserId.trim()],
    queryFn: () => (projectsApi.memberCandidates ? projectsApi.memberCandidates(id, memberUserId.trim()) : Promise.resolve([])),
    enabled: !!canManage,
    retry: false,
  });
  const canEditCases = canManage || projectQ.data?.my_role === 'analyst' || projectQ.data?.my_role === 'reviewer';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project', id] });
    queryClient.invalidateQueries({ queryKey: ['project-cases', id] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['project-members', id] });
    queryClient.invalidateQueries({ queryKey: ['project-member-candidates', id] });
  };

  const toggleStatusM = useMutation({
    mutationFn: () => projectsApi.update(id, { status: projectQ.data?.status === 'active' ? 'archived' : 'active' }),
    onSuccess: () => {
      setError('');
      invalidate();
    },
    onError: (err) => setError(apiErrorMessage(err, t('projects_update_error'))),
  });

  const deleteM = useMutation({
    mutationFn: () => projectsApi.remove(id),
    onSuccess: () => router.push('/projects'),
    onError: (err) => {
      setError(apiErrorMessage(err, t('projects_delete_error')));
      setShowDeleteConfirm(false);
    },
  });

  const removeCaseM = useMutation({
    mutationFn: (caseId: string) => projectsApi.removeCase(id, caseId),
    onSuccess: () => {
      setError('');
      invalidate();
    },
    onError: (err) => setError(apiErrorMessage(err, t('projects_remove_case_error'))),
  });

  const addCaseM = useMutation({
    mutationFn: (caseId: string) => projectsApi.addCase(id, caseId),
    onSuccess: () => {
      setError('');
      setShowAddCase(false);
      invalidate();
    },
    onError: (err) => setError(apiErrorMessage(err, t('projects_add_case_error'))),
  });

  const addMemberM = useMutation({
    mutationFn: () => projectsApi.addMember(id, memberUserId.trim(), memberRole),
    onSuccess: () => { setMemberUserId(''); setError(''); invalidate(); },
    onError: (err) => setError(apiErrorMessage(err, t('projects_member_add_error'))),
  });
  const removeMemberM = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(id, userId),
    onSuccess: () => { setError(''); invalidate(); },
    onError: (err) => setError(apiErrorMessage(err, t('projects_member_remove_error'))),
  });

  if (projectQ.isLoading) {
    return (
      <WorkspaceLayout>
        <div role="status" className="h-full flex items-center justify-center text-[var(--chrome-text-500)] font-mono text-xs">{t('common_loading')}</div>
      </WorkspaceLayout>
    );
  }

  if (projectQ.isError || !projectQ.data) {
    return (
      <WorkspaceLayout>
        <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--chrome-text-500)] font-mono">
          <p role="alert" className="text-xs">{axios.isAxiosError(projectQ.error) && projectQ.error.response?.status === 404 ? t('projects_not_found') : t('common_load_error')}</p>
          <button onClick={() => projectQ.refetch()} disabled={projectQ.isFetching} className="text-xs underline disabled:opacity-50">{t('common_retry')}</button>
          <Link href="/projects" className="text-[var(--accent-cyan-soft)] hover:underline text-xs flex items-center gap-1">
            <ArrowLeft size={12} /> {t('projects_back_to_list')}
          </Link>
        </div>
      </WorkspaceLayout>
    );
  }

  const project = projectQ.data;
  const cases = casesQ.data ?? [];

  return (
    <WorkspaceLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 h-full overflow-y-auto max-w-5xl mx-auto">
        <Link href="/projects" className="text-[var(--chrome-text-500)] hover:text-[var(--chrome-text-300)] text-xs font-mono flex items-center gap-1">
          <ArrowLeft size={12} /> {t('projects_back_to_list')}
        </Link>

        <div className="border border-[color-mix(in_srgb,var(--chrome-border-800)_80%,transparent)] rounded-2xl p-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <FolderGit2 size={18} className="text-[var(--accent-cyan-soft)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-mono text-[var(--chrome-text-white)]">{project.title}</h1>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest border ${
                    project.status === 'active'
                      ? 'text-[var(--accent-emerald-soft)] border-emerald-500/30 bg-emerald-500/10'
                      : 'text-[var(--chrome-text-500)] border-[color-mix(in_srgb,var(--chrome-border-600)_40%,transparent)]'
                  }`}
                >
                  {project.status === 'active' ? t('projects_status_active') : t('projects_status_archived')}
                </span>
              </div>
              <p className="text-xs text-[var(--chrome-text-500)] font-mono mt-1 max-w-xl">{project.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canManage && <button
              onClick={() => toggleStatusM.mutate()}
              disabled={toggleStatusM.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] hover:border-cyan-500/50 text-[var(--chrome-text-300)] rounded-xl text-xxs font-bold font-mono disabled:opacity-40 transition-all"
            >
              {project.status === 'active' ? <Archive size={12} /> : <RotateCcw size={12} />}
              {project.status === 'active' ? t('projects_status_archived') : t('projects_status_active')}
            </button>}
            {canManage && <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 border border-red-500/30 hover:bg-red-600/20 text-[var(--accent-red-soft)] rounded-xl text-xxs font-bold font-mono transition-all"
            >
              <Trash2 size={12} /> {t('common_delete')}
            </button>}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-[var(--accent-red-soft)] px-4 py-2.5 rounded-xl text-xs font-semibold font-mono">
            {error}
          </div>
        )}

        <section className="border border-[color-mix(in_srgb,var(--chrome-border-800)_65%,transparent)] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold font-mono text-[var(--chrome-text-white)]">{t('projects_members_title')}</h2>{membersQ.isFetching && <span className="text-[9px] text-[var(--chrome-text-500)]">{t('common_loading')}</span>}</div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--bg-main)] px-3 py-2"><span className="truncate">{project.owner_id}</span><span className="text-[var(--accent-cyan-soft)]">{t('projects_member_owner')}</span></div>
            {(membersQ.data ?? []).map((member) => <div key={member.user_id} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--bg-main)] px-3 py-2"><span className="truncate">{member.user_name ? `${member.user_name} (${member.user_email || member.user_id})` : member.user_id}</span><span className="text-[var(--chrome-text-400)]">{t(`projects_role_${member.role}` as 'projects_role_analyst')}</span>{canManage && <button aria-label={t('projects_member_remove')} onClick={() => removeMemberM.mutate(member.user_id)} disabled={removeMemberM.isPending} className="text-[var(--accent-red-soft)] disabled:opacity-40"><X size={13} /></button>}</div>)}
            {membersQ.isError && <p role="alert" className="text-[var(--accent-red-soft)]">{t('projects_members_load_error')}</p>}
            {!membersQ.isError && !membersQ.isLoading && (membersQ.data ?? []).length === 0 && <p className="text-[var(--chrome-text-500)]">{t('projects_members_empty')}</p>}
          </div>
          {canManage && <form onSubmit={(e) => { e.preventDefault(); if (memberUserId.trim()) addMemberM.mutate(); }} className="flex flex-wrap gap-2">
            <input aria-label={t('projects_member_user_id')} value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} placeholder={t('projects_member_user_id')} className="flex-1 min-w-48 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-lg px-3 py-2 text-xs font-mono" />
            <select aria-label={t('projects_member_role')} value={memberRole} onChange={(e) => setMemberRole(e.target.value as ProjectMember['role'])} className="bg-[var(--bg-main)] border border-[var(--chrome-border-800)] rounded-lg px-2 py-2 text-xs font-mono"><option value="viewer">{t('projects_role_viewer')}</option><option value="analyst">{t('projects_role_analyst')}</option><option value="reviewer">{t('projects_role_reviewer')}</option></select>
            <button type="submit" disabled={!memberUserId.trim() || addMemberM.isPending} className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-xs disabled:opacity-40">{t('projects_member_add')}</button>
          </form>}
          {canManage && (candidatesQ.data ?? []).length > 0 && (
            <div className="space-y-1.5 text-xxs font-mono">
              <p className="text-[var(--chrome-text-500)]">{t('projects_member_candidates_hint')}</p>
              <div className="flex flex-wrap gap-1.5">
                {(candidatesQ.data ?? []).slice(0, 8).map((cand) => (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => setMemberUserId(cand.email || cand.id)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-main)] border border-[var(--chrome-border-800)] hover:border-cyan-500/50 text-[var(--chrome-text-300)] transition-all"
                  >
                    {cand.name ? `${cand.name} (${cand.email})` : cand.email || cand.id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-mono uppercase tracking-wide text-[var(--chrome-text-white)]">
              {t('projects_linked_cases_title')} ({cases.length})
            </h2>
            {canEditCases && <button
              onClick={() => { setError(''); setShowAddCase(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xxs font-bold font-mono transition-all"
            >
              <Plus size={12} /> {t('projects_add_case_btn')}
            </button>}
          </div>

          {casesQ.isLoading && <p role="status" className="text-xs">{t('common_loading')}</p>}
          {casesQ.isError && (
            <div role="alert" className="text-sm text-[var(--accent-red-soft)]">
              <p>{t('common_load_error')}</p>
              <button onClick={() => casesQ.refetch()} disabled={casesQ.isFetching} className="underline disabled:opacity-50">{t('common_retry')}</button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.map((c) => (
              <div key={c.id} className="bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-2xl p-5 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--chrome-text-500)]">{c.status}</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${PRIORITY_STYLE[c.priority] || PRIORITY_STYLE.medium}`}>
                    {c.priority}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[var(--chrome-text-200)] font-mono mt-2">{c.title}</h3>
                <div className="flex flex-wrap gap-2 items-center justify-between mt-3 pt-3 border-t border-[color-mix(in_srgb,var(--chrome-border-800)_40%,transparent)] text-xxs font-mono">
                  <Link href={'/search?case=' + encodeURIComponent(c.id)} className="hover:underline">{t('projects_search_entities')}</Link>
                  <Link href={`/graph/${c.id}`} className="flex items-center gap-1 text-[var(--accent-cyan-soft)] hover:underline">
                    <Share2 size={11} /> {t('cases_open_graph_link')}
                  </Link>
                  {canEditCases && <button
                    onClick={() => removeCaseM.mutate(c.id)}
                    disabled={removeCaseM.isPending}
                    className="flex items-center gap-1 text-[var(--accent-red-soft)] hover:underline disabled:opacity-40"
                  >
                    <X size={11} /> {t('common_delete')}
                  </button>}
                </div>
              </div>
            ))}

            {!casesQ.isLoading && !casesQ.isError && cases.length === 0 && (
              <div className="col-span-full py-10 flex flex-col items-center justify-center text-center text-[var(--chrome-text-500)] gap-2 font-mono">
                <p className="text-xs">{t('projects_no_linked_cases')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddCase && (
        <AddCaseModal
          error={error}
          alreadyLinkedIds={cases.map((c: ProjectCaseSummary) => c.id)}
          isPending={addCaseM.isPending}
          onCancel={() => setShowAddCase(false)}
          onAdd={(caseId) => {
            addCaseM.mutate(caseId);
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title={t('projects_delete_title')}
          message={`${t('projects_delete_message_prefix')}${project.title}${t('projects_delete_message_suffix')}`}
          isPending={deleteM.isPending}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => deleteM.mutate()}
        />
      )}
    </WorkspaceLayout>
  );
}

function AddCaseModal({
  error,
  alreadyLinkedIds,
  isPending,
  onCancel,
  onAdd,
}: {
  error: string;
  alreadyLinkedIds: string[];
  isPending: boolean;
  onCancel: () => void;
  onAdd: (caseId: string) => void;
}) {
  const t = useT();
  const allCasesQ = useQuery({ queryKey: ['cases'], queryFn: () => casesApi.list() });
  const linkedSet = new Set(alreadyLinkedIds);
  const available = (allCasesQ.data ?? []).filter((c) => !linkedSet.has(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--chrome-border-800)] rounded-2xl p-6 space-y-4 max-h-[80vh] flex flex-col">
        <h2 className="text-sm font-bold font-mono uppercase tracking-wide text-[var(--chrome-text-white)]">{t('projects_add_case_title')}</h2>
        {error && <p role="alert" className="text-xs text-[var(--accent-red-soft)]">{error}</p>}
        <div className="flex-1 overflow-y-auto space-y-2">
          {allCasesQ.isLoading && <p role="status" className="text-xs">{t('common_loading')}</p>}
          {allCasesQ.isError && (
            <div role="alert" className="text-sm text-[var(--accent-red-soft)]">
              <p>{t('common_load_error')}</p>
              <button onClick={() => allCasesQ.refetch()} disabled={allCasesQ.isFetching} className="underline disabled:opacity-50">{t('common_retry')}</button>
            </div>
          )}
          {available.map((c) => (
            <button
              key={c.id}
              disabled={isPending}
              onClick={() => onAdd(c.id)}
              className="w-full text-left px-3 py-2.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] hover:border-cyan-500/50 rounded-xl text-xs text-[var(--chrome-text-200)] font-mono disabled:opacity-40 transition-all"
            >
              {c.title}
            </button>
          ))}
          {available.length === 0 && !allCasesQ.isLoading && !allCasesQ.isError && (
            <p className="text-xs text-[var(--chrome-text-500)] font-mono text-center py-6">{t('projects_add_case_empty')}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-[var(--chrome-text-500)] hover:text-[var(--chrome-text-300)] rounded-xl text-xs font-semibold font-mono transition-all self-start"
        >
          {t('common_cancel')}
        </button>
      </div>
    </div>
  );
}

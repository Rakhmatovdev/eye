'use client';
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardList, RotateCcw, Send, X } from 'lucide-react';
import { workflowApi, type WorkItem } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import { useAuthStore } from '../../store/authStore';

export default function CaseTasksModal({ caseId, caseTitle, onClose }: { caseId: string; caseTitle: string; onClose: () => void }) {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState(user?.id ?? '');
  const [reviewerId, setReviewerId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const tasksQ = useQuery({ queryKey: ['case-tasks', caseId], queryFn: () => workflowApi.list(caseId) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['case-tasks', caseId] });
  const createM = useMutation({
    mutationFn: () => workflowApi.create(caseId, { title, description, assignee_id: assigneeId, reviewer_id: reviewerId || undefined, due_at: dueAt ? new Date(`${dueAt}T23:59:59`).toISOString() : undefined }),
    onSuccess: () => { setTitle(''); setDescription(''); setReviewerId(''); setDueAt(''); setError(''); invalidate(); },
    onError: (e) => setError(apiErrorMessage(e, t('workflow_save_error'))),
  });
  const actionM = useMutation({
    mutationFn: ({ task, action }: { task: WorkItem; action: string }) => workflowApi.transition(caseId, task.id, action, comment),
    onSuccess: () => { setComment(''); setError(''); invalidate(); },
    onError: (e) => setError(apiErrorMessage(e, t('workflow_action_error'))),
  });
  const admin = user?.role === 'admin';

  return <div role="dialog" aria-modal="true" aria-labelledby="case-tasks-title" className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3">
    <section className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-[var(--bg-card)] border border-[var(--chrome-border-800)] rounded-2xl p-5 space-y-5">
      <header className="flex items-start justify-between gap-3"><div><h2 id="case-tasks-title" className="text-sm font-bold font-mono text-[var(--chrome-text-white)] flex items-center gap-2"><ClipboardList size={16} />{t('workflow_title')}</h2><p className="mt-1 text-xs text-[var(--chrome-text-500)]">{caseTitle}</p></div><button aria-label={t('common_close')} onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-main)]"><X size={16} /></button></header>
      {error && <p role="alert" className="text-xs text-[var(--accent-red-soft)] bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); createM.mutate(); }} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 border border-[var(--chrome-border-800)] rounded-xl">
        <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('workflow_task_title')} className="md:col-span-2 bg-[var(--bg-main)] rounded-lg border border-[var(--chrome-border-800)] px-3 py-2 text-xs" />
        <textarea maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('workflow_description')} className="md:col-span-2 bg-[var(--bg-main)] rounded-lg border border-[var(--chrome-border-800)] px-3 py-2 text-xs" />
        <input required value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} aria-label={t('workflow_assignee')} placeholder={t('workflow_assignee')} className="bg-[var(--bg-main)] rounded-lg border border-[var(--chrome-border-800)] px-3 py-2 text-xs font-mono" />
        <input value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} aria-label={t('workflow_reviewer')} placeholder={t('workflow_reviewer')} className="bg-[var(--bg-main)] rounded-lg border border-[var(--chrome-border-800)] px-3 py-2 text-xs font-mono" />
        <label className="text-[10px] text-[var(--chrome-text-500)]">{t('workflow_due')}<input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="mt-1 block w-full bg-[var(--bg-main)] rounded-lg border border-[var(--chrome-border-800)] px-3 py-2 text-xs" /></label>
        <button type="submit" disabled={!title.trim() || !assigneeId.trim() || createM.isPending} className="self-end bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg px-3 py-2 text-xs font-bold">{createM.isPending ? t('common_loading') : t('workflow_add')}</button>
      </form>
      <div className="space-y-2">
        {tasksQ.isLoading && <p role="status" className="text-xs">{t('common_loading')}</p>}
        {tasksQ.isError && <div role="alert" className="text-xs text-[var(--accent-red-soft)]">{t('workflow_load_error')} <button onClick={() => tasksQ.refetch()} className="underline">{t('common_retry')}</button></div>}
        {(tasksQ.data ?? []).map((task) => <article key={task.id} className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--chrome-border-800)] space-y-2">
          <div className="flex justify-between gap-2"><div><h3 className="text-xs font-bold font-mono">{task.title}</h3><p className="text-[10px] text-[var(--chrome-text-500)] mt-1">{task.description}</p></div><span className={`h-fit text-[9px] px-2 py-1 rounded border ${task.overdue ? 'border-red-500/40 text-red-400' : 'border-[var(--chrome-border-800)] text-[var(--chrome-text-400)]'}`}>{task.overdue ? t('workflow_overdue') : t(`workflow_status_${task.status}` as 'workflow_status_open')}</span></div>
          <p className="text-[10px] font-mono text-[var(--chrome-text-500)]">{t('workflow_assignee')}: {task.assignee_id} · {task.due_at ? new Date(task.due_at).toLocaleDateString() : t('workflow_no_due')}</p>
          <div className="flex flex-wrap gap-2">
            {(task.status === 'open' || task.status === 'changes_requested') && (admin || user?.id === task.assignee_id) && <button onClick={() => actionM.mutate({ task, action: 'submit_review' })} disabled={actionM.isPending} className="flex items-center gap-1 text-[10px] text-cyan-300"><Send size={11} />{t('workflow_submit_review')}</button>}
            {task.status === 'in_review' && <><button onClick={() => actionM.mutate({ task, action: 'approve' })} disabled={actionM.isPending} className="flex items-center gap-1 text-[10px] text-emerald-300"><Check size={11} />{t('workflow_approve')}</button><button onClick={() => { if (!comment.trim()) { setError(t('workflow_comment_required')); return; } actionM.mutate({ task, action: 'request_changes' }); }} disabled={actionM.isPending} className="flex items-center gap-1 text-[10px] text-amber-300"><RotateCcw size={11} />{t('workflow_request_changes')}</button></>}
            {task.status === 'approved' && (admin || user?.id === task.assignee_id) && <button onClick={() => actionM.mutate({ task, action: 'complete' })} disabled={actionM.isPending} className="flex items-center gap-1 text-[10px] text-emerald-300"><Check size={11} />{t('workflow_complete')}</button>}
            {(task.status === 'approved' || task.status === 'completed') && <button onClick={() => { if (!comment.trim()) { setError(t('workflow_comment_required')); return; } actionM.mutate({ task, action: 'reopen' }); }} disabled={actionM.isPending} className="flex items-center gap-1 text-[10px] text-amber-300"><RotateCcw size={11} />{t('workflow_reopen')}</button>}
          </div>
          <details className="text-[10px] text-[var(--chrome-text-500)]"><summary className="cursor-pointer">{t('workflow_history')} ({task.history.length})</summary><ol className="mt-2 space-y-1">{task.history.map((event, i) => <li key={`${event.at}-${i}`}>{new Date(event.at).toLocaleString()} · {event.actor_id} · {event.action}{event.comment ? ` — ${event.comment}` : ''}</li>)}</ol></details>
        </article>)}
        {!tasksQ.isLoading && !tasksQ.isError && tasksQ.data?.length === 0 && <p className="text-xs text-[var(--chrome-text-500)]">{t('workflow_empty')}</p>}
      </div>
      <div className="flex gap-2"><input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} placeholder={t('workflow_review_comment')} className="flex-1 bg-[var(--bg-main)] rounded-lg border border-[var(--chrome-border-800)] px-3 py-2 text-xs" /><button onClick={onClose} className="px-3 py-2 border border-[var(--chrome-border-800)] rounded-lg text-xs">{t('common_close')}</button></div>
    </section>
  </div>;
}

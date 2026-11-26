'use client';
import {recordAnchor,focusRecord} from './RecordFocus';
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, GripVertical, Plus, Search, UserRound } from 'lucide-react';
import { workflowApi, type WorkItem, type WorkItemStatus } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiClient';
import { actionTargets, boardColumns, taskActions, type TaskAction } from '../../lib/workbench';
import type { CaseWorkspace } from '../../lib/workspaceApi';
import { useAuthStore } from '../../store/authStore';
import { useT, type TKey } from '../../lib/i18n';
import Modal from '../common/Modal';
import { DateLabel, ErrorMessage, QueryState } from './Shared';

export default function TaskBoard({ caseId, context }: { caseId: string; context: CaseWorkspace }) {
  const t = useT(); const user = useAuthStore(s => s.user); const qc = useQueryClient();
  const key = ['case-tasks', caseId, user?.id];
  const query = useQuery({ queryKey: key, queryFn: () => workflowApi.list(caseId), refetchInterval: 30_000 });
  const [search, setSearch] = useState(''); const [mine, setMine] = useState(false);
  const [create, setCreate] = useState(false); const [error, setError] = useState('');
  const [dragged, setDragged] = useState<string | null>(null); const [over, setOver] = useState<WorkItemStatus | null>(null);
  const [review, setReview] = useState<{ task: WorkItem; action: TaskAction } | null>(null); const [comment, setComment] = useState('');
  const mutation = useMutation({ mutationFn: ({ task, action, note = '' }: { task: WorkItem; action: TaskAction; note?: string }) => workflowApi.transition(caseId, task.id, action, note),
    onSuccess: () => { setError(''); setReview(null); setComment(''); void qc.invalidateQueries({ queryKey: ['case-tasks', caseId] }); void qc.invalidateQueries({ queryKey: ['workspace-inbox'] }); },
    onError: e => { setError(apiErrorMessage(e, t('wb_error'))); void query.refetch(); } });
  const actions = (task: WorkItem) => taskActions(task, user?.id ?? '', user?.role === 'admin', context);
  const act = (task: WorkItem, action: TaskAction) => { setError(''); if (action === 'request_changes' || action === 'reopen') { setReview({ task, action }); setComment(''); } else mutation.mutate({ task, action }); };
  const tasks = (query.data ?? []).filter(task => (!mine || task.assignee_id === user?.id) && `${task.title} ${task.description}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const name = (id: string) => context.participants.find(p => p.id === id)?.name || id;
  return <div className="wb-stack">
    <div className="wb-toolbar"><div><h2>{t('wb_board')}</h2><p>{t('wb_board_note')}</p></div>{context.can_write && <button className="dashboard-primary-button" onClick={() => setCreate(true)}><Plus size={16} />{t('wb_new_task')}</button>}</div>
    <div className="wb-filter-row"><label className="wb-search"><Search size={16} /><input aria-label={t('wb_search')} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('wb_search')} /></label><button className="wb-chip" aria-pressed={mine} onClick={() => setMine(!mine)}><UserRound size={14} />{t('wb_mine')}</button><span className="wb-muted">{tasks.length} / {query.data?.length ?? 0}</span></div>
    {!review && <ErrorMessage message={error} />}<QueryState query={query} />
    {!query.isPending && !query.isError && <div className="wb-board" aria-label={t('wb_board')}>{boardColumns.map(status => {
      const column = tasks.filter(task => task.status === status);
      const dragging = query.data?.find(task => task.id === dragged);
      const dropAction = dragging && actions(dragging).find(action => actionTargets[action] === status);
      return <section key={status} className={`wb-column status-${status} ${over === status && dropAction ? 'can-drop' : ''}`} onDragOver={e => { if (dropAction && !mutation.isPending) { e.preventDefault(); setOver(status); } }} onDragLeave={() => setOver(null)} onDrop={e => { e.preventDefault(); if (dragging && dropAction) act(dragging, dropAction); setDragged(null); setOver(null); }}>
        <h3><span className="wb-status-dot" />{t(`workflow_status_${status}` as TKey)}<span className="wb-count">{column.length}</span></h3>
        <div className="wb-column-cards">{column.map(task => <article id={recordAnchor("task",task.id)} ref={node=>focusRecord(node,"task",task.id)} key={task.id} data-task-id={task.id} className={`wb-task ${task.overdue ? 'is-overdue' : ''}`} draggable={!mutation.isPending && actions(task).length > 0} onDragStart={e => { e.dataTransfer.setData('text/plain', task.id); e.dataTransfer.effectAllowed = 'move'; setDragged(task.id); }} onDragEnd={() => { setDragged(null); setOver(null); }}>
          <div className="wb-task-heading"><h4>{task.title}</h4><GripVertical size={15} aria-hidden="true" /></div>{task.description && <p className="wb-task-description">{task.description}</p>}
          <div className="wb-task-meta"><span><UserRound size={12} />{name(task.assignee_id)}</span>{task.reviewer_id && <span>{t('wb_reviewer')}: {name(task.reviewer_id)}</span>}<span className={task.overdue ? 'wb-danger' : ''}><CalendarClock size={12} />{task.due_at ? <DateLabel value={task.due_at} /> : t('workflow_no_due')}</span>{task.overdue && <strong className="wb-danger">{t('workflow_overdue')}</strong>}</div>
          <div className="wb-task-actions">{actions(task).map(action => <button key={action} disabled={mutation.isPending} onClick={() => act(task, action)}>{t(`workflow_${action}` as TKey)}</button>)}</div>
          <details className="wb-history"><summary>{t('workflow_history')} ({task.history.length})</summary><ol>{task.history.map((h, i) => <li key={i}><DateLabel value={h.at} /><span>{name(h.actor_id)} · {h.action === 'created' ? t('wb_created') : h.action === 'updated' ? t('wb_edit') : t(`workflow_${h.action}` as TKey)}</span>{h.comment && <p>{h.comment}</p>}</li>)}</ol></details>
        </article>)}{!column.length && <p className="wb-column-empty">{t('wb_empty')}</p>}</div>
      </section>;
    })}</div>}
    {create && <TaskForm caseId={caseId} context={context} onClose={() => setCreate(false)} />}
    {review && <Modal title={t(`workflow_${review.action}` as TKey)} onClose={() => { setReview(null); setError(''); }} busy={mutation.isPending}><form className="wb-form" onSubmit={e => { e.preventDefault(); mutation.mutate({ ...review, note: comment.trim() }); }}><p>{review.task.title}</p><label>{t('wb_reviewer_note')}<textarea required maxLength={2000} value={comment} onChange={e => setComment(e.target.value)} /></label><ErrorMessage message={error} /><button className="dashboard-primary-button" disabled={mutation.isPending || !comment.trim()}>{t('wb_save')}</button></form></Modal>}
  </div>;
}

function TaskForm({ caseId, context, onClose }: { caseId: string; context: CaseWorkspace; onClose: () => void }) {
  const t = useT(); const user = useAuthStore(s => s.user); const qc = useQueryClient();
  const assignees = context.participants.filter(p => user?.role === 'admin' || p.role === 'analyst' || p.role === 'owner');
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [assignee, setAssignee] = useState(assignees.find(p => p.id === user?.id)?.id ?? assignees[0]?.id ?? ''); const [reviewer, setReviewer] = useState(''); const [due, setDue] = useState(''); const [error, setError] = useState('');
  const reviewers = context.participants.filter(p => p.id !== assignee && (user?.role === 'admin' || p.role === 'reviewer' || p.role === 'owner'));
  const mutation = useMutation({ mutationFn: () => workflowApi.create(caseId, { title: title.trim(), description: description.trim(), assignee_id: assignee, reviewer_id: reviewer || undefined, due_at: due ? new Date(due).toISOString() : undefined }), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['case-tasks', caseId] }); onClose(); }, onError: e => setError(apiErrorMessage(e, t('wb_error'))) });
  return <Modal title={t('wb_new_task')} onClose={onClose} busy={mutation.isPending}><form className="wb-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
    <label>{t('workflow_task_title')}<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label><label>{t('workflow_description')}<textarea maxLength={4000} value={description} onChange={e => setDescription(e.target.value)} /></label>
    <div className="wb-form-grid"><label>{t('wb_assignee')}<select aria-label={t('wb_assignee')} required value={assignee} onChange={e => { setAssignee(e.target.value); if (reviewer === e.target.value) setReviewer(''); }}>{!assignees.length && <option value="">{t('wb_none')}</option>}{assignees.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>{t('wb_reviewer')}<select aria-label={t('wb_reviewer')} value={reviewer} onChange={e => setReviewer(e.target.value)}><option value="">{t('wb_none')}</option>{reviewers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
    {!reviewers.length && <p className="wb-muted">{t('wb_no_reviewer')}</p>}<label>{t('workflow_due')}<input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} /></label><ErrorMessage message={error} /><button className="dashboard-primary-button" disabled={mutation.isPending || !title.trim() || !assignee}>{mutation.isPending ? t('common_loading') : t('wb_new_task')}</button>
  </form></Modal>;
}


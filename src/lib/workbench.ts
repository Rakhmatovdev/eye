import type { WorkItem, WorkItemStatus } from './api';
import type { CaseWorkspace, ReportVersion, WorkspaceNotification } from './workspaceApi';
import { stableValue } from './research';

export const boardColumns: WorkItemStatus[] = ['open', 'changes_requested', 'in_review', 'approved', 'completed'];
export const actionTargets = { submit_review: 'in_review', request_changes: 'changes_requested', approve: 'approved', complete: 'completed', reopen: 'changes_requested' } as const;
export type TaskAction = keyof typeof actionTargets;
export function taskActions(task: WorkItem, userId: string, admin: boolean, context: CaseWorkspace): TaskAction[] {
  const assigned = context.can_write && (admin || task.assignee_id === userId);
  const review = admin || (context.can_review && task.assignee_id !== userId && (!task.reviewer_id || task.reviewer_id === userId));
  if (task.status === 'open' || task.status === 'changes_requested') return assigned ? ['submit_review'] : [];
  if (task.status === 'in_review') return review ? ['approve', 'request_changes'] : [];
  if (task.status === 'approved') return [...(assigned ? ['complete' as const] : []), ...(review ? ['reopen' as const] : [])];
  return review ? ['reopen'] : [];
}
export function notificationSnoozed(n: WorkspaceNotification, now = Date.now()): boolean { return !!n.snoozed_until && Date.parse(n.snoozed_until) > now; }
export function compareReports(previous: ReportVersion, current: ReportVersion) {
  const oldIDs = new Set(previous.evidence.map(e => e.id));
  const newIDs = new Set(current.evidence.map(e => e.id));
  const changed = current.evidence.filter(e => { const old = previous.evidence.find(v => v.id === e.id); return old && stableValue(old) !== stableValue(e); });
  return { summaryChanged: previous.summary !== current.summary, titleChanged: previous.title !== current.title, changed, added: current.evidence.filter(e => !oldIDs.has(e.id)), removed: previous.evidence.filter(e => !newIDs.has(e.id)) };
}

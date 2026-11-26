import { taskActions, compareReports, notificationSnoozed } from '../workbench';
import type { WorkItem } from '../api';
import type { CaseWorkspace, ReportVersion, WorkspaceNotification } from '../workspaceApi';

const task = { status: 'open', assignee_id: 'author', reviewer_id: 'reviewer' } as WorkItem;
const context: CaseWorkspace = { can_write: true, can_review: true, participants: [] };
test('board preserves separation between the assigned analyst and reviewer', () => {
  expect(taskActions(task, 'author', false, context)).toEqual(['submit_review']);
  expect(taskActions(task, 'reviewer', false, context)).toEqual([]);
  expect(taskActions({ ...task, status: 'in_review' }, 'author', false, context)).toEqual([]);
  expect(taskActions({ ...task, status: 'in_review' }, 'reviewer', false, context)).toEqual(['approve', 'request_changes']);
  expect(taskActions({ ...task, status: 'in_review' }, 'other', false, context)).toEqual([]);
});
test('read-only participants cannot move cards', () => {
  expect(taskActions(task, 'author', false, { ...context, can_write: false, can_review: false })).toEqual([]);
});
test('approved and completed cards expose only valid next actions', () => {
  expect(taskActions({ ...task, status: 'approved' }, 'author', false, context)).toEqual(['complete']);
  expect(taskActions({ ...task, status: 'completed' }, 'reviewer', false, context)).toEqual(['reopen']);
});
test('comparison identifies actual evidence additions and removals', () => {
  const before = { summary: 'Old', evidence: [{ id: 'a' }, { id: 'b' }] } as ReportVersion;
  const after = { summary: 'New', evidence: [{ id: 'b' }, { id: 'c' }] } as ReportVersion;
  const diff = compareReports(before, after);
  expect(diff.summaryChanged).toBe(true);
  expect(diff.added.map(e => e.id)).toEqual(['c']);
  expect(diff.removed.map(e => e.id)).toEqual(['a']);
});
test('snoozed notifications become active at their deadline', () => {
  const notice = { snoozed_until: '2026-10-02T12:00:00Z' } as WorkspaceNotification;
  expect(notificationSnoozed(notice, Date.parse('2026-10-02T11:59:00Z'))).toBe(true);
  expect(notificationSnoozed(notice, Date.parse('2026-10-02T12:00:00Z'))).toBe(false);
});

import {compareFields,stableValue,workload} from '../research';
import {compareReports} from '../workbench';
import type {WorkItem} from '../api';
import type {ReportVersion} from '../workspaceApi';

test('comparison ignores object key order but preserves null, missing and array differences',()=>{
  expect(stableValue({a:1,b:{x:2,y:3}})).toBe(stableValue({b:{y:3,x:2},a:1}));
  const rows=compareFields({same:{b:2,a:1},empty:null,order:[1,2],removed:'value'},{same:{a:1,b:2},empty:'',order:[2,1],added:0});
  expect(rows.filter(r=>r.changed).map(r=>r.field)).toEqual(['added','empty','order','removed']);
  expect(rows.find(r=>r.field==='removed')?.after).toBe('—');
});
test('workload excludes completed tasks from overdue and separates upcoming deadlines',()=>{
  const now=Date.parse('2026-10-05T12:00:00Z');
  const tasks=[{assignee_id:'a',status:'completed',due_at:'2020-01-01'}, {assignee_id:'a',status:'open',due_at:'2026-10-04'}, {assignee_id:'a',status:'in_review',due_at:'2026-10-06'}, {assignee_id:'b',status:'open'}, {assignee_id:'b',status:'approved',due_at:'2026-12-01'}] as WorkItem[];
  expect(workload(tasks,now)).toEqual({a:{active:2,review:1,completed:1,overdue:1,soon:1},b:{active:2,review:0,completed:0,overdue:0,soon:0}});
});
test('report comparison catches changed snapshots with the same evidence ID',()=>{
  const before={summary:'Old conclusion',title:'Report',evidence:[{id:'e',conclusion:'Before',files:[]}]} as unknown as ReportVersion;
  const after={...before,summary:'New conclusion',evidence:[{...before.evidence[0],conclusion:'After'}]};
  const diff=compareReports(before,after);
  expect(diff.summaryChanged).toBe(true);expect(diff.changed.map(e=>e.id)).toEqual(['e']);expect(diff.added).toEqual([]);expect(diff.removed).toEqual([]);
});

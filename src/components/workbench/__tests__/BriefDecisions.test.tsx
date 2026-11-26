import React from 'react';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import BriefMatrix from '../BriefMatrix';
import BriefComparison from '../BriefComparison';
import {decisionsApi,type BriefMatrix as MatrixData,type BriefComparison as ComparisonData} from '../../../lib/analyticsDecisions';
import type {AnalyticsBrief} from '../../../lib/briefAnalytics';
import {useLocaleStore} from '../../../store/localeStore';
jest.mock('../../../lib/analyticsDecisions',()=>({decisionsApi:{matrix:jest.fn(),save:jest.fn(),compare:jest.fn(),explain:jest.fn()}}));
const requirement={id:'r1',text:'Complete tasks',metric:'tasks_completed_pct' as const,operator:'gte' as const,line:1,target:80};
const plan={id:'plan',revision:3,requirements:[requirement]} as AnalyticsBrief;
const matrix:MatrixData={revision:3,entries:[{requirement,record:null,restricted:false,evidence:[],tasks:[],missing_references:0,verification_valid:false,overdue:false}],participants:[],evidence_options:[{id:'proof',title:'Completion proof'}],task_options:[],options_limited:false,can_write:true,can_review:false};
const period={start:'2026-10-11T00:00:00Z',end:'2026-10-12T00:00:00Z',samples:1,sample_at:'2026-10-11T12:00:00Z'};
const comparison:ComparisonData={revision:3,days:1,at:period.end,before:{...period,sample_id:'before'},after:{...period,sample_id:'after'},rows:[{requirement_id:'r1',text:requirement.text,metric:requirement.metric,unit:'percent',before:50,after:75,delta:25,relative_percent:50,delta_unit:'percentage_points',state:'up',before_status:'gap',after_status:'gap'}]};
beforeEach(()=>{jest.clearAllMocks();useLocaleStore.getState().setLocale('en');jest.mocked(decisionsApi.matrix).mockResolvedValue(matrix);jest.mocked(decisionsApi.compare).mockResolvedValue(comparison);});
function mount(node:React.ReactNode){const qc=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);}
test('matrix saves reviewed input with revision/version and blocks verification without review rights',async()=>{
 mount(<BriefMatrix caseId="case" plan={plan}/>);await userEvent.click(await screen.findByRole('button',{name:'Edit'}));
 expect(screen.getByRole('option',{name:'Verified'})).toBeDisabled();
 await userEvent.selectOptions(screen.getByLabelText('Status'),'in_progress');
 await userEvent.selectOptions(screen.getByLabelText('Evidence'),'proof');
 await userEvent.type(screen.getByLabelText('Notes / verification basis'),'Work started');
 jest.mocked(decisionsApi.save).mockRejectedValue(new Error('conflict'));
 await userEvent.click(screen.getByRole('button',{name:'Save'}));
 await waitFor(()=>expect(decisionsApi.save).toHaveBeenCalledWith('case',plan,'r1',expect.objectContaining({plan_revision:3,version:0,status:'in_progress',notes:'Work started',evidence_ids:['proof'],due_at:null})));
 expect(await screen.findByRole('alert')).toBeVisible();expect(screen.getByLabelText('Notes / verification basis')).toHaveValue('Work started');
});
test('restricted rows expose no edit control or record content',async()=>{
 jest.mocked(decisionsApi.matrix).mockResolvedValue({...matrix,entries:[{...matrix.entries[0],restricted:true}]});
 mount(<BriefMatrix caseId="case" plan={plan}/>);await screen.findByText(/Insufficient access/);expect(screen.queryByRole('button',{name:'Edit'})).not.toBeInTheDocument();
});
test('comparison uses percentage points, selected snapshots and resets explanation on period change',async()=>{
 jest.mocked(decisionsApi.explain).mockResolvedValue({comparison:comparison.rows[0],before_at:period.start,after_at:period.end,mechanism:'ratio_change',factors:[{key:'factor_tasks_completed',before:1,after:3,delta:2}],records:[],limited:false,legacy_factors:false,causality_confirmed:false});
 mount(<BriefComparison caseId="case" plan={plan}/>);await screen.findByText(/percentage points/);
 await userEvent.click(screen.getByRole('button',{name:'Explain'}));await screen.findByText(/Completed tasks: 1/);
 expect(decisionsApi.explain).toHaveBeenCalledWith('case','plan','r1','before','after');expect(screen.getByText(/do not establish confirmed causality/)).toBeVisible();
 await userEvent.selectOptions(screen.getByLabelText('Window length'),'7');await waitFor(()=>expect(decisionsApi.compare).toHaveBeenCalledWith('case','plan',7));expect(screen.queryByRole('button',{name:'Close explanation'})).not.toBeInTheDocument();
});
test('missing snapshots remain unknown and cannot be explained',async()=>{
 jest.mocked(decisionsApi.compare).mockResolvedValue({...comparison,before:{...period,samples:0},rows:[{...comparison.rows[0],before:null,delta:null,relative_percent:null,state:'no_data'}]});
 mount(<BriefComparison caseId="case" plan={plan}/>);expect(await screen.findByRole('button',{name:'Explain'})).toBeDisabled();expect(screen.getByText('—')).toBeVisible();
});
test('matrix filters rows by status and search text',async()=>{
 mount(<BriefMatrix caseId="case" plan={plan}/>);await screen.findByText('Complete tasks');
 await userEvent.selectOptions(screen.getByLabelText('Filter by status'),'verified');
 expect(screen.getByText('No requirements match this filter.')).toBeVisible();
 await userEvent.selectOptions(screen.getByLabelText('Filter by status'),'all');
 await userEvent.type(screen.getByLabelText('Filter requirements'),'nonexistent');
 expect(screen.getByText('No requirements match this filter.')).toBeVisible();
});

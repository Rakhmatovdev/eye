jest.mock('../../../lib/analyticsGrowth',()=>({growthApi:{sources:jest.fn().mockResolvedValue([])}}));
jest.mock('../AnalyticsSources',()=>()=>null);
jest.mock('../AnalyticsHistory',()=>()=>null);
jest.mock('../BriefMatrix',()=>()=>null);
jest.mock('../BriefComparison',()=>()=>null);
jest.mock('../DataQuality',()=>()=>null);
jest.mock('../BriefVersions',()=>()=>null);
import React from 'react';
import {render,screen,waitFor,act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import BriefAnalytics from '../BriefAnalytics';
import {briefApi,type AnalyticsBrief,type BriefLive} from '../../../lib/briefAnalytics';
import {useLocaleStore} from '../../../store/localeStore';
jest.mock('../../../lib/briefAnalytics',()=>({...jest.requireActual('../../../lib/briefAnalytics'),briefApi:{list:jest.fn(),create:jest.fn(),update:jest.fn(),live:jest.fn()}}));
jest.mock('../../../lib/api',()=>({attachmentsApi:{list:jest.fn().mockResolvedValue([]),upload:jest.fn(),download:jest.fn()}}));
const plan:AnalyticsBrief={id:'brief',case_id:'case',title:'Test brief',classification:'internal',attachment_id:'file',filename:'spec.txt',file_sha256:'abc',text_sha256:'def',requirements:[{id:'r1',text:'People at least 2 people',line:1,metric:'people_total',target:2,operator:'gte'},{id:'r2',text:'AI accuracy 99% required',line:2,metric:'',operator:'gte'}],omitted:0,engine:'rules-v1',published:true,revision:2,created_by:'u',updated_by:'u',created_at:'2026-10-12T10:00:00Z',updated_at:'2026-10-12T10:00:00Z'};
const live:BriefLive={plan_id:'brief',revision:2,at:new Date().toISOString(),refresh_seconds:5,kpis:[{...plan.requirements[0],value:1,unit:'count',status:'gap'},{...plan.requirements[1],value:null,unit:'',status:'no_data',reason:'unmapped'}],entity_types:[{label:'person',count:1}],task_statuses:[],event_hours:[],partial:false,scope:'visible_case_records',source_available:true};
beforeEach(()=>{jest.clearAllMocks();useLocaleStore.getState().setLocale('en');jest.mocked(briefApi.list).mockResolvedValue([plan]);jest.mocked(briefApi.live).mockResolvedValue(live);});
function mount(canWrite=false){const qc=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});return render(<QueryClientProvider client={qc}><BriefAnalytics caseId="case" context={{participants:[],can_write:canWrite,can_review:false}}/></QueryClientProvider>);}
test('readers see real KPIs and unknown requirements without editing controls',async()=>{mount();await screen.findByText('Outside target');expect(screen.getByText('Insufficient data')).toBeVisible();expect(screen.getByText('—')).toBeVisible();expect(screen.queryByRole('button',{name:'Edit KPI plan'})).not.toBeInTheDocument();expect(screen.getByText(/not semantic AI analysis/)).toBeVisible();});
test('large drafts retain edits across pages and submit every requirement',async()=>{
 const requirements=Array.from({length:41},(_,i)=>({...plan.requirements[0],id:`r${i+1}`,line:i+1,text:`Requirement ${i+1}`}));
 const large={...plan,published:false,requirements};jest.mocked(briefApi.list).mockResolvedValue([large]);jest.mocked(briefApi.update).mockResolvedValue({...large,published:true});mount(true);
 await screen.findByText('Requirement 1');expect(screen.queryByText('Requirement 21')).not.toBeInTheDocument();await userEvent.clear(screen.getByLabelText('Target (optional) r1'));await userEvent.type(screen.getByLabelText('Target (optional) r1'),'5');
 await userEvent.click(screen.getByRole('button',{name:'Next',exact:true}));await screen.findByText('Requirement 21');await userEvent.click(screen.getByRole('button',{name:'Previous',exact:true}));expect(screen.getByLabelText('Target (optional) r1')).toHaveValue(5);
 await userEvent.click(screen.getByRole('button',{name:'Save and track live'}));await waitFor(()=>expect(briefApi.update).toHaveBeenCalledWith('case',expect.anything(),true,expect.arrayContaining([expect.objectContaining({id:'r1',target:5}),expect.objectContaining({id:'r41'})])));expect(jest.mocked(briefApi.update).mock.calls[0][3]).toHaveLength(41);
});
test('drafts do not poll and publishing sends the current revision and reviewed mappings',async()=>{jest.mocked(briefApi.list).mockResolvedValue([{...plan,published:false}]);jest.mocked(briefApi.update).mockResolvedValue(plan);mount(true);await screen.findByText('People at least 2 people');expect(briefApi.live).not.toHaveBeenCalled();await userEvent.click(screen.getByRole('button',{name:'Save and track live'}));await waitFor(()=>expect(briefApi.update).toHaveBeenCalledWith('case',expect.objectContaining({revision:2}),true,plan.requirements));await screen.findByText('Outside target');});
test('a failed refresh hides cached KPI values and offers retry',async()=>{mount();await screen.findByText('Outside target');jest.mocked(briefApi.live).mockRejectedValue(new Error('unavailable'));await userEvent.click(screen.getByRole('button',{name:'Refresh now'}));await screen.findByRole('alert');expect(screen.queryByText('Outside target')).not.toBeInTheDocument();expect(screen.getByText(/last result may be stale/)).toBeVisible();});
test('live polling observes changes within five seconds and can be paused',async()=>{
 jest.useFakeTimers();try{mount();expect(await screen.findByText('Outside target')).toBeVisible();jest.mocked(briefApi.live).mockResolvedValue({...live,at:new Date().toISOString(),kpis:[{...live.kpis[0],value:3,status:'met'},live.kpis[1]]});await act(async()=>{await jest.advanceTimersByTimeAsync(5000);});expect(await screen.findByText('Target met')).toBeVisible();const ui=userEvent.setup({advanceTimers:jest.advanceTimersByTime});await ui.click(screen.getByRole('button',{name:'Pause'}));const calls=jest.mocked(briefApi.live).mock.calls.length;await act(async()=>{await jest.advanceTimersByTimeAsync(10000);});expect(briefApi.live).toHaveBeenCalledTimes(calls);expect(screen.getByText('Tracking paused')).toBeVisible();}finally{jest.useRealTimers();}
});

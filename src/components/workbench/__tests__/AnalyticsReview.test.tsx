import React from 'react';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import BriefVersions from '../BriefVersions';
import DataQuality from '../DataQuality';
import BriefMatrix from '../BriefMatrix';
import {reviewApi,type BriefVersion,type DataQuality as QualityData} from '../../../lib/analyticsReview';
import {decisionsApi,type BriefMatrix as MatrixData} from '../../../lib/analyticsDecisions';
import type {AnalyticsBrief} from '../../../lib/briefAnalytics';
import {useLocaleStore} from '../../../store/localeStore';
jest.mock('../../../lib/analyticsReview',()=>({reviewApi:{versions:jest.fn(),diff:jest.fn(),quality:jest.fn()}}));
jest.mock('../../../lib/analyticsDecisions',()=>({decisionsApi:{matrix:jest.fn(),save:jest.fn()}}));
const req={id:'r',text:'Collect proof',metric:'evidence_total' as const,line:1,operator:'gte' as const};
const plan={id:'p',revision:2,title:'Technical brief',filename:'spec.txt',updated_at:'2026-10-13T01:00:00Z',requirements:[req]} as AnalyticsBrief;
const a:BriefVersion={key:'a',plan_id:'p',plan:{...plan,revision:1}},b:BriefVersion={key:'b',plan_id:'p',plan};
const quality:QualityData={at:plan.updated_at,entities_scanned:2,evidence_scanned:1,sources_scanned:1,missing_labels:0,duplicate_groups:1,unassessed_evidence:0,stale_sources:1,missing_sources:0,unresolved_conflicts:0,issues:[{kind:'duplicate_candidate',id:'e1',title:'Alice',count:2,ids:['e1','e2']}],limited:true};
const matrix:MatrixData={revision:2,can_write:true,can_review:true,entries:[{requirement:req,record:null,restricted:false,evidence:[],tasks:[],missing_references:0,verification_valid:false,overdue:false}],participants:[],evidence_options:[{id:'proof',title:'Proof'}],task_options:[],options_limited:false};
beforeEach(()=>{jest.resetAllMocks();useLocaleStore.getState().setLocale('en');jest.mocked(reviewApi.versions).mockResolvedValue({versions:[a,b],limited:false});jest.mocked(reviewApi.quality).mockResolvedValue(quality);jest.mocked(decisionsApi.matrix).mockResolvedValue(matrix);});
function mount(node:React.ReactNode){const qc=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);}
test('version comparison requires distinct choices and marks heuristic matches',async()=>{
 jest.mocked(reviewApi.diff).mockResolvedValue({before:a,after:b,changes:[{kind:'changed',before:req,after:{...req,text:'Collect verified proof'},match:'text_similarity'}],unchanged:0,algorithm:'text-and-mapping-v1'});
 mount(<BriefVersions caseId="case" revisionKey="p:2"/>);await screen.findByLabelText('Previous brief / revision');expect(screen.getByRole('button',{name:'Compare',exact:true})).toBeDisabled();
 await userEvent.selectOptions(screen.getByLabelText('Previous brief / revision'),'a');await userEvent.selectOptions(screen.getByLabelText('New brief / revision'),'a');expect(screen.getByRole('button',{name:'Compare',exact:true})).toBeDisabled();
 await userEvent.selectOptions(screen.getByLabelText('New brief / revision'),'b');await userEvent.click(screen.getByRole('button',{name:'Compare',exact:true}));await screen.findByText('Text similarity — review required');expect(reviewApi.diff).toHaveBeenCalledWith('case',a,b);
});
test('quality names duplicate candidates and discloses scan limits',async()=>{mount(<DataQuality caseId="case"/>);await screen.findByRole('link',{name:'Alice'});expect(screen.getByText(/not merged automatically/)).toBeVisible();expect(screen.getByText(/not a complete assessment/)).toBeVisible();expect(screen.getByRole('link',{name:'e2'})).toHaveAttribute('href','/entity/e2');await userEvent.selectOptions(screen.getByLabelText('Issue kind'),'stale_source');expect(screen.queryByRole('link',{name:'Alice'})).not.toBeInTheDocument();});
test('failed quality request does not claim a clean case',async()=>{jest.mocked(reviewApi.quality).mockRejectedValue(new Error('unavailable'));mount(<DataQuality caseId="case"/>);await screen.findByRole('alert');expect(screen.queryByText('No issues found in scanned records.')).not.toBeInTheDocument();});
test('verification remains blocked until a criterion has text, review basis and a passing decision',async()=>{
 mount(<BriefMatrix caseId="case" plan={plan}/>);await userEvent.click(await screen.findByRole('button',{name:'Edit'}));await userEvent.selectOptions(screen.getByLabelText('Status'),'verified');await userEvent.selectOptions(screen.getByLabelText('Evidence'),'proof');await userEvent.type(screen.getByLabelText('Notes / verification basis'),'Reviewed proof');expect(screen.getByRole('button',{name:'Save',exact:true})).toBeDisabled();
 await userEvent.click(screen.getByRole('button',{name:'Add criterion'}));await userEvent.type(screen.getByLabelText('Criterion 1'),'Source confirmed');expect(screen.getByRole('checkbox',{name:'Passed 1'})).toBeDisabled();await userEvent.type(screen.getByLabelText('Review basis 1'),'Checked source document');await userEvent.click(screen.getByRole('checkbox',{name:'Passed 1'}));expect(screen.getByRole('button',{name:'Save',exact:true})).toBeEnabled();
 jest.mocked(decisionsApi.save).mockRejectedValue(new Error('conflict'));await userEvent.click(screen.getByRole('button',{name:'Save',exact:true}));await waitFor(()=>expect(decisionsApi.save).toHaveBeenCalledWith('case',plan,'r',expect.objectContaining({criteria:[expect.objectContaining({text:'Source confirmed',basis:'Checked source document',passed:true})]})));
 await userEvent.type(screen.getByLabelText('Criterion 1'),' changed');expect(screen.getByRole('checkbox',{name:'Passed 1'})).not.toBeChecked();expect(screen.getByRole('button',{name:'Save',exact:true})).toBeDisabled();
});

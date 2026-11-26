import React from 'react';
import {render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import ResearchTools from '../ResearchTools';
import {TeamWorkload} from '../ComparisonTools';
import {researchApi,type Research} from '../../../lib/research';
import {workspaceApi,type CaseWorkspace} from '../../../lib/workspaceApi';
import {casesApi,workflowApi} from '../../../lib/api';
import {useLocaleStore} from '../../../store/localeStore';
import {useAuthStore} from '../../../store/authStore';

jest.mock('../../../lib/research',()=>({...jest.requireActual('../../../lib/research'),researchApi:{get:jest.fn(),save:jest.fn(),templates:jest.fn(),apply:jest.fn()}}));
jest.mock('../../../lib/workspaceApi',()=>({workspaceApi:{evidence:jest.fn(),context:jest.fn()}}));
jest.mock('../../../lib/api',()=>({casesApi:{entities:jest.fn(),list:jest.fn()},workflowApi:{list:jest.fn()}}));
const context:CaseWorkspace={can_write:true,can_review:true,participants:[{id:'owner',name:'Owner',role:'owner'}]};
const initial:Research={case_id:'case',version:0,classification:'internal',cards:[],links:[],hypotheses:[],checklist:[],report_outline:'',updated_at:'',updated_by:''};
function mount(ui:React.ReactNode) {const qc=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);}
beforeEach(()=>{jest.clearAllMocks();useLocaleStore.getState().setLocale('en');useAuthStore.getState().login({id:'owner',name:'Owner',email:'test@example.com',role:'analyst',clearance:'SECRET'});jest.mocked(researchApi.get).mockResolvedValue({...initial});jest.mocked(workspaceApi.evidence).mockResolvedValue([]);jest.mocked(casesApi.entities).mockResolvedValue([]);});
test('board saves notes and retains unsaved draft after a conflict',async()=>{
  const user=userEvent.setup();jest.mocked(researchApi.save).mockRejectedValue(new Error('conflict'));
  mount(<ResearchTools caseId="case" context={context} mode="canvas"/>);
  await user.type(await screen.findByRole('textbox',{name:'Note'}),'Verify the source');
  await user.click(screen.getByRole('button',{name:'Add card'}));
  await user.click(screen.getByRole('button',{name:'Save'}));
  await screen.findByRole('alert');
  expect(researchApi.save).toHaveBeenCalledWith('case',expect.objectContaining({version:0,cards:[expect.objectContaining({kind:'note',note:'Verify the source'})]}));
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Note: Verify the source'})).toBeInTheDocument();
});
test('read only viewers cannot add or save board content',async()=>{
  mount(<ResearchTools caseId="case" context={{...context,can_write:false}} mode="canvas"/>);
  expect(await screen.findByRole('button',{name:'Add card'})).toBeDisabled();
  expect(screen.queryByRole('button',{name:'Save'})).not.toBeInTheDocument();
});
test('one evidence item cannot be selected on both sides of a hypothesis',async()=>{
  jest.mocked(researchApi.get).mockResolvedValue({...initial,hypotheses:[{id:'h',title:'A working hypothesis',notes:'',status:'open',supporting:[],opposing:[]}]});
  jest.mocked(workspaceApi.evidence).mockResolvedValue([{id:'e',title:'Source A',conclusion:'An observation'}] as never);
  const user=userEvent.setup();mount(<ResearchTools caseId="case" context={context} mode="hypotheses"/>);
  const supporting=await screen.findByRole('group',{name:'Supporting evidence (0)'});
  await user.click(within(supporting).getByRole('checkbox'));
  expect(within(screen.getByRole('group',{name:'Opposing evidence (0)'})).getByRole('checkbox')).toBeDisabled();
});
test('team totals are withheld when a case task request fails',async()=>{
  jest.mocked(casesApi.list).mockResolvedValue([{id:'case',title:'A case'}] as never);
  jest.mocked(workflowApi.list).mockRejectedValue(new Error('Unavailable'));
  mount(<TeamWorkload/>);await waitFor(()=>expect(screen.getByRole('alert')).toBeInTheDocument());
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
test('open questions are persisted with the hypothesis and can be marked answered',async()=>{
 jest.mocked(researchApi.get).mockResolvedValue({...initial,hypotheses:[{id:'h',title:'A working hypothesis',notes:'',status:'open',supporting:[],opposing:[]}]});
 const user=userEvent.setup();mount(<ResearchTools caseId="case" context={context} mode="hypotheses"/>);
 await user.type(await screen.findByRole('textbox',{name:'Open questions'}),'Which source can disprove it?');
 await user.click(screen.getByRole('button',{name:'Add question'}));
 await user.click(screen.getByRole('checkbox',{name:'Which source can disprove it?'}));
 await user.click(screen.getByRole('button',{name:'Save'}));
 await waitFor(()=>expect(researchApi.save).toHaveBeenCalledWith('case',expect.objectContaining({hypotheses:[expect.objectContaining({questions:[expect.objectContaining({title:'Which source can disprove it?',done:true})]})]})));
});

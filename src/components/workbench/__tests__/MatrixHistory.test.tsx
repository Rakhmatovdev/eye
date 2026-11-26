import React from 'react';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import MatrixHistory from '../MatrixHistory';
import {decisionsApi,type MatrixRecord} from '../../../lib/analyticsDecisions';
import {useLocaleStore} from '../../../store/localeStore';
jest.mock('../../../lib/analyticsDecisions',()=>({decisionsApi:{history:jest.fn()}}));
test('history loads only when opened and pages retained snapshots',async()=>{
 useLocaleStore.getState().setLocale('en');const record={version:2,status:'in_progress',notes:'Removed obsolete criterion',updated_by:'reviewer',updated_at:'2026-10-13T00:00:00Z',criteria:[]} as unknown as MatrixRecord;
 jest.mocked(decisionsApi.history).mockImplementation(async(_case,_plan,_req,before)=>before?{rows:[{record:{...record,version:1,notes:'Original basis',criteria:[{id:'c',text:'Original criterion',passed:false,basis:''}]}}],next:0}:{rows:[{record}],next:2});const qc=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});render(<QueryClientProvider client={qc}><MatrixHistory caseId="case" planId="p" reqId="r" revision={1}/></QueryClientProvider>);
 expect(decisionsApi.history).not.toHaveBeenCalled();await userEvent.click(screen.getByText('Edit history'));await screen.findByText('Removed obsolete criterion');
 await userEvent.click(screen.getByRole('button',{name:'Older edits'}));await screen.findByText(/Original criterion/);await waitFor(()=>expect(decisionsApi.history).toHaveBeenCalledWith('case','p','r',2));
 await userEvent.click(screen.getByRole('button',{name:'Newer edits'}));await screen.findByText('Removed obsolete criterion');
});

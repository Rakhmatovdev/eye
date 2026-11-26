import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CaseTimeline from '../CaseTimeline';
import { workspaceApi } from '../../../lib/workspaceApi';
import { useLocaleStore } from '../../../store/localeStore';
import { useAuthStore } from '../../../store/authStore';

jest.mock('../../../lib/workspaceApi', () => ({ workspaceApi: { timeline: jest.fn() } }));
beforeEach(() => { jest.resetAllMocks(); useLocaleStore.getState().setLocale('en'); useAuthStore.getState().login({ id:'owner', name:'Owner', email:'test@example.com', role:'analyst', clearance:'SECRET' }); });
function mount() { const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});return render(<QueryClientProvider client={qc}><CaseTimeline caseId="case"/></QueryClientProvider>); }
test('paginates and resets the page when changing record type',async()=>{
	jest.mocked(workspaceApi.timeline).mockResolvedValue({items:[{id:'evidence:1',kind:'evidence',subject_id:'1',title:'Archive record',source:'Archive 42',actor_id:'owner',at:'2026-10-09T10:00:00Z'}],total:31,page:1,limit:30});
	mount();await screen.findByText('Archive record');
	await userEvent.click(screen.getByRole('button',{name:'Next'}));
	await waitFor(()=>expect(workspaceApi.timeline).toHaveBeenLastCalledWith('case','all',2));
	await userEvent.selectOptions(screen.getByRole('combobox'),'event');
	await waitFor(()=>expect(workspaceApi.timeline).toHaveBeenLastCalledWith('case','event',1));
});
test('shows failed reads explicitly and does not show an empty timeline',async()=>{
	jest.mocked(workspaceApi.timeline).mockRejectedValue(new Error('Forbidden'));
	mount();await screen.findByRole('alert');
	expect(screen.queryByRole('list')).not.toBeInTheDocument();
	expect(screen.getByRole('button',{name:'Try again'})).toBeInTheDocument();
});

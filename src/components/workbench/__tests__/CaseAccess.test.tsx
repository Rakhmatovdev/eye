import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CaseAccess from '../CaseAccess';
import { workspaceApi } from '../../../lib/workspaceApi';
import { useLocaleStore } from '../../../store/localeStore';
jest.mock('../../../lib/workspaceApi',()=>({workspaceApi:{access:jest.fn()}}));
beforeEach(()=>{jest.resetAllMocks();useLocaleStore.getState().setLocale('en');});
function mount(){const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});return render(<QueryClientProvider client={qc}><CaseAccess caseId="case"/></QueryClientProvider>);}
test('shows effective read-only rights and project members',async()=>{
	jest.mocked(workspaceApi.access).mockResolvedValue({classification:'internal',project_id:'project',can_read:true,can_write:false,can_review:false,can_export:true,clearance:1,participants:[{id:'viewer',name:'Viewer',role:'viewer'}]});
	mount();await screen.findByText('Viewer');
	expect(within(screen.getByText('Write').parentElement!).getByText('Denied')).toBeInTheDocument();
	expect(screen.getByRole('link',{name:'Manage project members'})).toHaveAttribute('href','/projects/project');
});
test('does not expose participants on a failed access check',async()=>{
	jest.mocked(workspaceApi.access).mockRejectedValue(new Error('Forbidden'));mount();await screen.findByRole('alert');expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchPage from '../page';
import { entitiesApi, savedSearchesApi, watchlistApi, casesApi } from '../../../lib/api';

jest.mock('../../../lib/api', () => ({ entitiesApi: { search: jest.fn(), exportCsv: jest.fn() }, savedSearchesApi: { list: jest.fn(), create: jest.fn(), remove: jest.fn(), setAlerts: jest.fn() }, watchlistApi: { list: jest.fn(), add: jest.fn() }, casesApi: { list: jest.fn(), addEntity: jest.fn() } }));
jest.mock('../../../lib/download', () => ({ triggerDownload: jest.fn() }));
jest.mock('../../../components/layout/WorkspaceLayout', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('../../../lib/i18n', () => ({ useT: () => (key: string) => key }));

function showPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><SearchPage /></QueryClientProvider>);
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(watchlistApi.list).mockResolvedValue([]);
  jest.mocked(savedSearchesApi.list).mockResolvedValue([]);
});

it('enables and disables a saved search subscription',async()=>{
	const saved={id:'saved',name:'People',query:'Alpha',type:'person',classification:'all',created_at:'2026-10-09',updated_at:'2026-10-09',alerts_enabled:false,last_checked_at:'2026-10-09'};
	jest.mocked(entitiesApi.search).mockResolvedValue({entities:[],total:0});
	jest.mocked(savedSearchesApi.list).mockResolvedValue([saved]);
	jest.mocked(savedSearchesApi.setAlerts).mockImplementation(async(_,enabled)=>{const next={...saved,alerts_enabled:enabled};jest.mocked(savedSearchesApi.list).mockResolvedValue([next]);return next;});
	showPage();await userEvent.click(await screen.findByRole('button',{name:'search_alerts_off: People'}));
	await waitFor(()=>expect(savedSearchesApi.setAlerts).toHaveBeenCalledWith('saved',true));
	await userEvent.click(await screen.findByRole('button',{name:'search_alerts_on: People'}));
	await waitFor(()=>expect(savedSearchesApi.setAlerts).toHaveBeenLastCalledWith('saved',false));
});

it('does not present loading as an empty search', () => {
  jest.mocked(entitiesApi.search).mockReturnValue(new Promise(() => {}));
  showPage();
  expect(screen.getByRole('status')).toHaveTextContent('common_loading');
  expect(screen.queryByText('search_no_results')).not.toBeInTheDocument();
});

it('shows an error instead of demo records and supports retry', async () => {
  jest.mocked(entitiesApi.search).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ entities: [], total: 0 });
  showPage();
  expect(await screen.findByRole('alert')).toHaveTextContent('common_load_error');
  expect(screen.queryByText('common_demo_data_badge')).not.toBeInTheDocument();
  expect(screen.queryByText('search_no_results')).not.toBeInTheDocument();
  await userEvent.click(screen.getByText('common_retry'));
  expect(await screen.findByText('search_no_results')).toBeInTheDocument();
});

it('paginates on the server, resets the page for a filter, and exports that filter', async () => {
  jest.mocked(entitiesApi.search).mockResolvedValue({ entities: [], total: 21 });
  jest.mocked(entitiesApi.exportCsv).mockResolvedValue(new Blob());
  showPage();
  await waitFor(() => expect(screen.getByText('search_next')).toBeEnabled());
  await userEvent.click(screen.getByText('search_next'));
  await waitFor(() => expect(entitiesApi.search).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: 20 }), expect.anything()));
  await userEvent.selectOptions(screen.getByLabelText('search_class_all'), 'secret');
  await waitFor(() => expect(entitiesApi.search).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, classification: 'secret' }), expect.anything()));
  await waitFor(() => expect(screen.getByText('export_csv_btn')).toBeEnabled());
  await userEvent.click(screen.getByText('export_csv_btn'));
  expect(entitiesApi.exportCsv).toHaveBeenCalledWith({ search: '', type: 'all', classification: 'secret' });
});

it.each(['', '?case=stale', '?case=case-1'])('attaches a search result after confirmation (%s)', async query => {
  window.history.replaceState(null, '', '/search' + query);
  jest.mocked(entitiesApi.search).mockResolvedValue({
    entities: [{ id: 'ent-1', name: 'Target Alpha', type: 'person', riskScore: 50, classification: 'internal', properties: {}, created_at: '2026-10-01', source: 'OSINT' }],
    total: 1,
  });
  jest.mocked(casesApi.list).mockResolvedValue([
    { id: 'case-1', title: 'Operation Horizon', description: '', status: 'open', priority: 'high', assignee: 'u1', entityCount: 0, created_at: '2026-10-01' },
  ]);
  jest.mocked(casesApi.addEntity).mockResolvedValue();
  showPage();
  await userEvent.click(await screen.findByRole('button', { name: 'search_add_to_case_btn: Target Alpha' }));
  await screen.findByRole('option', { name: 'Operation Horizon' });
  const picker = screen.getByRole('combobox', { name: 'search_add_to_case_title' });
  expect(picker).toHaveValue(query === '?case=case-1' ? 'case-1' : '');
  await userEvent.selectOptions(picker, 'case-1');
  await userEvent.click(screen.getByRole('button', { name: 'search_add_to_case_title' }));
  await waitFor(() => expect(casesApi.addEntity).toHaveBeenCalledWith('case-1', 'ent-1'));
});

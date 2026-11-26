import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../page';
import { alertsApi, casesApi, projectsApi, patternsApi } from '../../../lib/api';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import type { Case } from '../../../data/mockCases';

jest.mock('../../../lib/api', () => ({
  casesApi: { list: jest.fn() }, projectsApi: { list: jest.fn() },
  alertsApi: { list: jest.fn() }, patternsApi: { list: jest.fn() },
}));
jest.mock('../../../components/layout/WorkspaceLayout', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('../../../lib/i18n', () => ({ useT: () => (key: string) => key }));

const makeCase = (id: string, priority: Case['priority'], status: Case['status'] = 'open'): Case => ({
  id, title: id, priority, status, description: '', assignee: '', entityCount: 3, created_at: '2026-09-15',
});
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><Dashboard /></QueryClientProvider>);
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(casesApi.list).mockResolvedValue([]);
  jest.mocked(projectsApi.list).mockResolvedValue([]);
  jest.mocked(alertsApi.list).mockResolvedValue({ alerts: [], total: 0, page: 1, limit: 5 });
  jest.mocked(patternsApi.list).mockResolvedValue([]);
});

it('shows pending states without presenting demo records', () => {
  jest.mocked(casesApi.list).mockReturnValue(new Promise(() => {}));
  show();
  expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  expect(screen.queryByText('Silk Road Customs Discrepancy')).not.toBeInTheDocument();
});

it('orders active cases by priority, excludes closed cases and selects the actual graph ID', async () => {
  jest.mocked(casesApi.list).mockResolvedValue([makeCase('routine', 'low'), makeCase('urgent', 'critical'), makeCase('finished', 'high', 'closed')]);
  show();
  await screen.findByText('urgent');
  const links = screen.getAllByRole('link').filter(link => link.getAttribute('href')?.startsWith('/graph/'));
  expect(links.map(link => link.getAttribute('href'))).toEqual(['/graph/urgent', '/graph/routine']);
  expect(screen.queryByText('finished')).not.toBeInTheDocument();
  await userEvent.click(links[0]);
  expect(useWorkspaceStore.getState().activeCaseId).toBe('urgent');
});

it('keeps API failures visible and recovers using retry', async () => {
  jest.mocked(casesApi.list).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([makeCase('recovered', 'high')]);
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('common_load_error');
  await userEvent.click(screen.getByRole('button', { name: 'common_retry' }));
  expect(await screen.findByText('recovered')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

it('does not silently replace a failed patterns request with mock results', async () => {
  jest.mocked(patternsApi.list).mockRejectedValue(new Error('offline'));
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('common_load_error');
  expect(screen.queryByText('workspace_pattern_score')).not.toBeInTheDocument();
});

it('filters active cases by priority and progress without changing the underlying list', async () => {
  const user = userEvent.setup();
  jest.mocked(casesApi.list).mockResolvedValue([makeCase('routine', 'low'), makeCase('urgent', 'critical'), makeCase('working', 'medium', 'in-progress')]);
  show();
  await screen.findByText('urgent');
  await user.click(screen.getByRole('button', { name: 'workspace_filter_priority' }));
  expect(screen.getByText('urgent')).toBeVisible();
  expect(screen.queryByText('routine')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'workspace_filter_progress' }));
  expect(screen.getByText('working')).toBeVisible();
  expect(screen.queryByText('urgent')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'workspace_filter_all' }));
  expect(screen.getByText('routine')).toBeVisible();
  expect(screen.getByText('urgent')).toBeVisible();
  expect(casesApi.list).toHaveBeenCalledTimes(1);
});

it('distinguishes an empty case filter from an empty workspace', async () => {
  jest.mocked(casesApi.list).mockResolvedValue([makeCase('routine', 'low')]);
  show();
  await screen.findByText('routine');
  await userEvent.click(screen.getByRole('button', { name: 'workspace_filter_priority' }));
  expect(screen.getByText('workspace_filter_empty')).toBeVisible();
  expect(screen.queryByText('workspace_cases_empty')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'workspace_show_all' }));
  expect(screen.getByText('routine')).toBeVisible();
});

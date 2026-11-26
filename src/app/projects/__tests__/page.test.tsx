import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectsPage from '../page';
import { projectsApi, type Project } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';

jest.mock('../../../lib/api', () => ({ projectsApi: { list: jest.fn(), create: jest.fn(), remove: jest.fn() } }));
jest.mock('../../../components/layout/WorkspaceLayout', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('../../../lib/i18n', () => ({ useT: () => (key: string) => key }));

function showPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><ProjectsPage /></QueryClientProvider>);
}

beforeEach(() => { jest.clearAllMocks(); useAuthStore.getState().logout(); });

it('shows a loading state without claiming the project list is empty', () => {
  jest.mocked(projectsApi.list).mockReturnValue(new Promise(() => {}));
  showPage();
  expect(screen.getByRole('status')).toHaveTextContent('common_loading');
  expect(screen.queryByText('projects_no_projects')).not.toBeInTheDocument();
});

it('distinguishes a failed request from an empty list and recovers on retry', async () => {
  jest.mocked(projectsApi.list).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  showPage();
  expect(await screen.findByRole('alert')).toHaveTextContent('common_load_error');
  expect(screen.queryByText('projects_no_projects')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'common_retry' }));
  expect(await screen.findByText('projects_no_projects')).toBeInTheDocument();
  expect(projectsApi.list).toHaveBeenCalledTimes(2);
});

it('disables a whitespace-only title and trims a valid title before saving', async () => {
  const user = userEvent.setup();
  jest.mocked(projectsApi.list).mockResolvedValue([]);
  jest.mocked(projectsApi.create).mockRejectedValue(new Error('offline'));
  showPage();
  await user.click(screen.getByRole('button', { name: 'projects_new_btn' }));
  const title = screen.getAllByRole('textbox')[0];
  await user.type(title, '   ');
  expect(screen.getByRole('button', { name: 'common_save' })).toBeDisabled();
  await user.type(title, 'MVP  ');
  await user.click(screen.getByRole('button', { name: 'common_save' }));
  await waitFor(() => expect(projectsApi.create).toHaveBeenCalledWith({ title: 'MVP', description: '' }));
  expect(await screen.findByRole('dialog', { name: 'projects_create_title' })).toBeVisible();
});

const project = (id: string, title: string, status: Project['status'], description = ''): Project => ({
  id, title, status, description, owner_id: 'owner', created_at: '2026-09-01', updated_at: id === '1' ? '2026-10-01' : '2026-09-01',
});

it('combines description search and status filtering, and can reset an empty result', async () => {
  const user = userEvent.setup();
  jest.mocked(projectsApi.list).mockResolvedValue([project('1', 'Trade', 'active', 'Regional review'), project('2', 'Archive', 'archived', 'Regional review')]);
  showPage();
  await screen.findByRole('heading', { name: 'Trade' });
  await user.type(screen.getByRole('searchbox'), 'regional');
  await user.selectOptions(screen.getByRole('combobox', { name: 'projects_filter_status' }), 'archived');
  expect(screen.queryByRole('heading', { name: 'Trade' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Archive' })).toBeVisible();
  await user.type(screen.getByRole('searchbox'), ' missing');
  expect(screen.getByText('projects_no_matches')).toBeVisible();
  await user.click(screen.getAllByRole('button', { name: 'search_reset' }).at(-1)!);
  expect(screen.getByRole('heading', { name: 'Trade' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Archive' })).toBeVisible();
});

it('sorts the same projects by updated date or name', async () => {
  const user = userEvent.setup();
  jest.mocked(projectsApi.list).mockResolvedValue([project('1', 'Zebra', 'active'), project('2', 'Alpha', 'active')]);
  showPage();
  await screen.findByRole('heading', { name: 'Zebra' });
  expect(screen.getAllByRole('article').map(card => card.querySelector('h2')?.textContent)).toEqual(['Zebra', 'Alpha']);
  await user.selectOptions(screen.getByRole('combobox', { name: 'projects_sort' }), 'name');
  expect(screen.getAllByRole('article').map(card => card.querySelector('h2')?.textContent)).toEqual(['Alpha', 'Zebra']);
});

it('offers deletion only for a project owned by the current non-admin user', async () => {
  useAuthStore.getState().login({ id: 'owner', name: 'Analyst', role: 'analyst', email: 'test@example.test', clearance: 'SECRET' });
  jest.mocked(projectsApi.list).mockResolvedValue([project('1', 'Owned', 'active'), { ...project('2', 'Shared', 'active'), owner_id: 'someone-else' }]);
  showPage();
  expect(await screen.findByRole('button', { name: 'common_delete: Owned' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'common_delete: Shared' })).not.toBeInTheDocument();
});

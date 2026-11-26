import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CaseDiagnostics from '../CaseDiagnostics';
import { workspaceApi, type CaseDiagnostics as Diagnostics } from '../../../lib/workspaceApi';
import { useLocaleStore } from '../../../store/localeStore';
import { casesApi } from '../../../lib/api';
jest.mock('../../../lib/api', () => ({ casesApi: { update: jest.fn() } }));
jest.mock('../../../lib/workspaceApi', () => ({ workspaceApi: { diagnostics: jest.fn(), reviewConflict: jest.fn() } }));
const data: Diagnostics = { score: 60, evidence_count: 2, claims_count: 2, truncated: false, checks: [{ key: 'sources', passed: false, missing: 1, tab: 'evidence' }], conflicts: [{ id: 'conflict', fingerprint: 'fingerprint', entity_id: 'entity', field: 'address', status: 'open', sides: [{ evidence_id: 'first', title: 'Archive A', source: 'Archive', claim: { entity_id: 'entity', field: 'address', value: 'Tashkent' } }, { evidence_id: 'second', title: 'Archive B', source: 'Register', claim: { entity_id: 'entity', field: 'address', value: 'Samarkand' } }] }] };
beforeEach(() => { jest.resetAllMocks(); useLocaleStore.getState().setLocale('en'); jest.mocked(workspaceApi.diagnostics).mockResolvedValue(data); jest.mocked(workspaceApi.reviewConflict).mockResolvedValue({}); });
function mount(review = true) { const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={qc}><CaseDiagnostics caseId="case" context={{ participants: [], can_write: review, can_review: review }}/></QueryClientProvider>); }
test('shows explainable readiness and sends an explicit reviewed decision with fingerprint', async () => {
  mount(); await screen.findByText('Tashkent'); expect(screen.getByRole('progressbar')).toHaveAttribute('value', '60'); expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/workbench?case=case&tab=evidence');
  expect(screen.getByRole('button', { name: 'Save decision' })).toBeDisabled(); await userEvent.type(screen.getByRole('textbox', { name: 'Decision reason' }), 'Both addresses can be valid'); await userEvent.selectOptions(screen.getByRole('combobox'), 'dismissed'); await userEvent.click(screen.getByRole('button', { name: 'Save decision' }));
  await waitFor(() => expect(workspaceApi.reviewConflict).toHaveBeenCalledWith('case', 'conflict', { fingerprint: 'fingerprint', status: 'dismissed', reason: 'Both addresses can be valid' }));
});
test('hides review controls for readers and explains truncated inspection', async () => { jest.mocked(workspaceApi.diagnostics).mockResolvedValue({ ...data, truncated: true }); mount(false); await screen.findByText('Tashkent'); expect(screen.getByRole('status')).toHaveTextContent('Results limited'); expect(screen.queryByRole('button', { name: 'Save decision' })).not.toBeInTheDocument(); });
test('failed fetch does not pretend the case has no conflicts', async () => { jest.mocked(workspaceApi.diagnostics).mockRejectedValue(new Error('Denied')); mount(); await screen.findByRole('alert'); expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(); expect(screen.queryByText('No conflicts found in the inspected structured claims.')).not.toBeInTheDocument(); });
test('saves a missing case description and refreshes readiness', async () => { mount(); await screen.findByText('Tashkent'); await userEvent.type(screen.getByRole('textbox', { name: 'Case description recorded' }), 'Investigation scope'); await userEvent.click(screen.getByRole('button', { name: 'Save' })); await waitFor(() => expect(casesApi.update).toHaveBeenCalledWith('case', { description: 'Investigation scope' })); await waitFor(() => expect(workspaceApi.diagnostics).toHaveBeenCalledTimes(2)); });

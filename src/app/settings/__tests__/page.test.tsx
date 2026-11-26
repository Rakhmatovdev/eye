import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from '../page';
import { authApi, mfaApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { translate } from '../../../lib/i18n';

jest.mock('../../../lib/workspaceApi', () => ({
  workspaceApi: { notifications: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../../../lib/api', () => ({
  authApi: {
    me: jest.fn(),
    changePassword: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
  },
  mfaApi: {
    enroll: jest.fn(),
    verify: jest.fn(),
    disable: jest.fn(),
  },
  sessionsApi: {
    list: jest.fn().mockResolvedValue([]),
    revoke: jest.fn(),
    revokeOthers: jest.fn(),
  },
}));

const mockedMe = authApi.me as jest.Mock;
const mockedChangePassword = authApi.changePassword as jest.Mock;

const currentUser = {
  id: 'u1',
  name: 'Jane Analyst',
  email: 'jane@platform.io',
  role: 'analyst',
  clearance: 'SECRET',
  mfaEnabled: false,
};

function renderSettings() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
    </QueryClientProvider>
  );
}

function inputNearLabel(labelText: string): HTMLInputElement {
  return screen.getByLabelText(labelText) as HTMLInputElement;
}

describe('SettingsPage — change password form', () => {
  beforeEach(() => {
    mockedMe.mockReset();
    mockedChangePassword.mockReset();
    (mfaApi.enroll as jest.Mock).mockReset();
    mockedMe.mockResolvedValue(currentUser);
    useAuthStore.getState().login(currentUser);
  });

  afterEach(() => {
    // Wrapped in act() because @testing-library/react's own auto-cleanup
    // (unmount) and this logout() both run in afterEach hooks — depending on
    // registration order the store update can otherwise land outside of a
    // React-managed update batch and trigger an act() warning.
    act(() => {
      useAuthStore.getState().logout();
    });
  });

  it('blocks submission and shows a mismatch error when new/confirm passwords differ', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.type(inputNearLabel(translate('settings_password_current', 'uz')), 'OldPass123!');
    await user.type(inputNearLabel(translate('settings_password_new', 'uz')), 'NewPass123!');
    await user.type(inputNearLabel(translate('settings_password_confirm', 'uz')), 'Different123!');

    await user.click(screen.getByRole('button', { name: translate('settings_password_submit', 'uz') }));

    expect(await screen.findByText(translate('settings_password_mismatch', 'uz'))).toBeInTheDocument();
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it('calls authApi.changePassword with current/new password when they match', async () => {
    const user = userEvent.setup();
    mockedChangePassword.mockResolvedValueOnce(undefined);
    renderSettings();

    await user.type(inputNearLabel(translate('settings_password_current', 'uz')), 'OldPass123!');
    await user.type(inputNearLabel(translate('settings_password_new', 'uz')), 'NewPass123!');
    await user.type(inputNearLabel(translate('settings_password_confirm', 'uz')), 'NewPass123!');

    await user.click(screen.getByRole('button', { name: translate('settings_password_submit', 'uz') }));

    await waitFor(() => expect(mockedChangePassword).toHaveBeenCalledWith('OldPass123!', 'NewPass123!'));
  });

  it('does not show a mismatch error when new and confirm passwords match', async () => {
    const user = userEvent.setup();
    mockedChangePassword.mockResolvedValueOnce(undefined);
    renderSettings();

    await user.type(inputNearLabel(translate('settings_password_current', 'uz')), 'OldPass123!');
    await user.type(inputNearLabel(translate('settings_password_new', 'uz')), 'NewPass123!');
    await user.type(inputNearLabel(translate('settings_password_confirm', 'uz')), 'NewPass123!');
    await user.click(screen.getByRole('button', { name: translate('settings_password_submit', 'uz') }));

    await waitFor(() => expect(mockedChangePassword).toHaveBeenCalled());
    expect(screen.queryByText(translate('settings_password_mismatch', 'uz'))).not.toBeInTheDocument();
  });
});

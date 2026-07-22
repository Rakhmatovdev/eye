import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginPage from '../page';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { useLocaleStore } from '../../../store/localeStore';

jest.mock('../../../lib/api', () => ({
  authApi: {
    login: jest.fn(),
  },
}));

const mockedLogin = authApi.login as jest.Mock;

describe('LoginPage', () => {
  const push = jest.fn();

  beforeEach(() => {
    mockedLogin.mockReset();
    push.mockReset();
    (useRouter as jest.Mock).mockReturnValue({ push, replace: jest.fn() });
    useAuthStore.getState().logout();
    // The store defaults to the 'uz' locale; pin to English so the button/
    // label text assertions below are locale-independent of that default.
    useLocaleStore.getState().setLocale('en');
  });

  it('renders the credentials form by default (no OTP field)', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('analyst@platform.io')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('000000')).not.toBeInTheDocument();
  });

  it('logs straight in and redirects to /dashboard when no MFA is required', async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValueOnce({
      mfaRequired: false,
      user: { id: 'u1', name: 'Analyst', email: 'a@b.com', role: 'analyst', clearance: 'SECRET' },
      token: 'access-1',
      refreshToken: 'refresh-1',
    });

    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /open workspace/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe('access-1');
  });

  it('switches to the OTP challenge screen when the API reports mfaRequired', async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValueOnce({ mfaRequired: true });

    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /open workspace/i }));

    expect(await screen.findByPlaceholderText('000000')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('analyst@platform.io')).not.toBeInTheDocument();
    // Should not have logged in yet — no tokens were issued at this step.
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it('submits the OTP on the second step and completes login', async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValueOnce({ mfaRequired: true });

    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /open workspace/i }));
    const otpInput = await screen.findByPlaceholderText('000000');

    mockedLogin.mockResolvedValueOnce({
      mfaRequired: false,
      user: { id: 'u1', name: 'Analyst', email: 'a@b.com', role: 'analyst', clearance: 'SECRET' },
      token: 'access-2',
      refreshToken: 'refresh-2',
    });

    await user.type(otpInput, '123456');
    await user.click(screen.getByRole('button', { name: /verify & continue/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(mockedLogin).toHaveBeenLastCalledWith('analyst@platform.io', 'Analyst123!', '123456');
  });

  it('shows an error message and stays on the form when login fails', async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Request failed',
      response: { data: { error: { message: 'Invalid credentials' } } },
    });

    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /open workspace/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('"Back to login" resets the OTP step, code, and any error', async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValueOnce({ mfaRequired: true });

    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /open workspace/i }));
    await screen.findByPlaceholderText('000000');

    await user.click(screen.getByRole('button', { name: /back to login/i }));

    expect(screen.getByPlaceholderText('analyst@platform.io')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('000000')).not.toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSearchParams } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResetPasswordPage from '../page';
import ForgotPasswordPage from '../../forgot-password/page';
import { authApi } from '../../../lib/api';
import { useLocaleStore } from '../../../store/localeStore';

jest.mock('../../../lib/api', () => ({ authApi: { resetPassword: jest.fn(), forgotPassword: jest.fn() } }));

function show(page: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}
beforeEach(() => {
  jest.clearAllMocks();
  useLocaleStore.getState().setLocale('en');
  jest.mocked(useSearchParams).mockReturnValue(new URLSearchParams('token=test-token') as ReturnType<typeof useSearchParams>);
});

it('provides a new-link action for a missing reset token without calling the API', () => {
  jest.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>);
  show(<ResetPasswordPage />);
  expect(screen.getByRole('alert')).toHaveTextContent('This reset link is invalid');
  expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute('href', '/forgot-password');
  expect(authApi.resetPassword).not.toHaveBeenCalled();
});

it('rejects mismatched passwords then saves matching passwords with the URL token', async () => {
  const user = userEvent.setup();
  jest.mocked(authApi.resetPassword).mockResolvedValue(undefined);
  show(<ResetPasswordPage />);
  await user.type(screen.getByLabelText('New password', { exact: true }), 'Password123!');
  await user.type(screen.getByLabelText('Confirm new password'), 'Mismatch123!');
  await user.click(screen.getByRole('button', { name: 'Update password' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
  expect(authApi.resetPassword).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('Confirm new password'));
  await user.type(screen.getByLabelText('Confirm new password'), 'Password123!');
  await user.click(screen.getByRole('button', { name: 'Update password' }));
  await waitFor(() => expect(authApi.resetPassword).toHaveBeenCalledWith('test-token', 'Password123!'));
  expect(await screen.findByRole('status')).toHaveTextContent('Your password has been updated');
  expect(screen.getByRole('link', { name: 'Go to login' })).toHaveAttribute('href', '/login');
});

it('keeps recovery errors visible and lets the user retry the same email', async () => {
  const user = userEvent.setup();
  jest.mocked(authApi.forgotPassword).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ message: 'sent' });
  show(<ForgotPasswordPage />);
  await user.type(screen.getByLabelText('Email address'), 'analyst@example.test');
  await user.click(screen.getByRole('button', { name: 'Send reset link' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not send the link');
  expect(screen.getByLabelText('Email address')).toHaveValue('analyst@example.test');
  await user.click(screen.getByRole('button', { name: 'Send reset link' }));
  expect(await screen.findByRole('status')).toHaveTextContent('If an account exists');
  await user.click(screen.getByRole('button', { name: 'Use a different email' }));
  expect(screen.getByLabelText('Email address')).toHaveValue('');
});

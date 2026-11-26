import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreferencesControls from '../PreferencesControls';
import { useLocaleStore } from '../../../store/localeStore';

beforeEach(() => useLocaleStore.getState().setLocale('en'));

it('selects a language with arrow keys and returns focus to the trigger', async () => {
  const user = userEvent.setup();
  render(<PreferencesControls />);
  screen.getByRole('button', { name: 'Language' }).focus();
  await user.keyboard('{ArrowDown}{Home}');
  expect(screen.getByRole('option', { name: 'O‘zbekcha' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(useLocaleStore.getState().locale).toBe('uz');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Til' })).toHaveFocus();
});

it('closes on Escape without changing the language', async () => {
  const user = userEvent.setup();
  render(<PreferencesControls />);
  await user.click(screen.getByRole('button', { name: 'Language' }));
  await user.keyboard('{ArrowUp}{Escape}');
  expect(useLocaleStore.getState().locale).toBe('en');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Language' })).toHaveFocus();
});

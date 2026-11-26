import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import QuickNavigation from '../QuickNavigation';

jest.mock('../../../lib/i18n', () => ({ useT: () => (key: string) => key }));
const push = jest.fn();
beforeEach(() => {
  push.mockClear();
  jest.mocked(useRouter).mockReturnValue({ push } as any);
});
const items = [{ name: 'Cases', path: '/cases' }, { name: 'Projects', path: '/projects' }, { name: 'Settings', path: '/settings' }];

it('opens with Ctrl K, filters routes, and navigates using Enter', async () => {
  const user = userEvent.setup();
  render(<QuickNavigation items={items} />);
  await user.keyboard('{Control>}k{/Control}');
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(screen.getByRole('combobox')).toHaveFocus();
  await user.type(screen.getByRole('combobox'), 'project');
  expect(screen.getAllByRole('option')).toHaveLength(1);
  await user.keyboard('{Enter}');
  expect(push).toHaveBeenCalledWith('/projects');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'workspace_quick_navigation' })).toHaveFocus();
});

it('supports arrow selection and closing without navigation', async () => {
  const user = userEvent.setup();
  render(<QuickNavigation items={items} />);
  await user.click(screen.getByRole('button', { name: 'workspace_quick_navigation' }));
  await user.keyboard('{ArrowDown}');
  expect(screen.getByRole('option', { name: 'Projects' })).toHaveAttribute('aria-selected', 'true');
  await user.click(screen.getByRole('button', { name: 'common_close' }));
  expect(push).not.toHaveBeenCalled();
});

it('shows an empty result and ignores Enter when nothing matches', async () => {
  const user = userEvent.setup();
  render(<QuickNavigation items={items} />);
  await user.click(screen.getByRole('button', { name: 'workspace_quick_navigation' }));
  await user.type(screen.getByRole('combobox'), 'unknown{ArrowDown}{Enter}');
  expect(screen.getByText('workspace_no_results')).toBeVisible();
  expect(push).not.toHaveBeenCalled();
});

it('filters correctly when graph navigation and cases share a destination', async () => {
  const user = userEvent.setup();
  render(<QuickNavigation items={[...items, { name: 'Graph Analysis', path: '/cases' }]} />);
  await user.click(screen.getByRole('button', { name: 'workspace_quick_navigation' }));
  await user.type(screen.getByRole('combobox'), 'project');
  expect(screen.getAllByRole('option')).toHaveLength(1);
  expect(screen.getByRole('option', { name: 'Projects' })).toBeVisible();
  await user.clear(screen.getByRole('combobox'));
  await user.type(screen.getByRole('combobox'), 'graph{Enter}');
  expect(push).toHaveBeenCalledWith('/cases');
});

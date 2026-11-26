import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../Modal';
import { useLocaleStore } from '../../../store/localeStore';

beforeEach(() => useLocaleStore.getState().setLocale('en'));

it('keeps Tab and Shift+Tab inside the dialog, skipping disabled actions', async () => {
  const user = userEvent.setup();
  render(<><button>Outside</button><Modal title="Create project" onClose={jest.fn()}>
    <input aria-label="Title" /><button data-modal-cancel>Cancel</button><button disabled>Save</button>
  </Modal></>);
  expect(screen.getByRole('textbox')).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  await user.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
});

it('blocks Escape while saving and permits cancellation when idle', () => {
  const close = jest.fn();
  const { rerender } = render(<Modal title="Create project" onClose={close} busy><button data-modal-cancel disabled>Cancel</button></Modal>);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
  expect(close).not.toHaveBeenCalled();
  rerender(<Modal title="Create project" onClose={close}><button data-modal-cancel>Cancel</button></Modal>);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
  expect(close).toHaveBeenCalledTimes(1);
});

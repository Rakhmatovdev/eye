'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useT } from '../../lib/i18n';

export default function Modal({ title, children, onClose, busy = false, initialFocus = 'first' }: {
  title: string; children: React.ReactNode; onClose: () => void; busy?: boolean; initialFocus?: 'first' | 'cancel';
}) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    element?.querySelector<HTMLElement>(initialFocus === 'cancel' ? '[data-modal-cancel]' : 'input, textarea, [data-modal-cancel]')?.focus();
    return () => { element?.close(); if (previous?.isConnected) previous.focus(); };
  }, [initialFocus]);

  return <dialog ref={dialog} className="workspace-modal" aria-labelledby={heading} aria-busy={busy} tabIndex={-1}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); event.currentTarget.focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => {
      if (busy || event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <div className="workspace-modal-heading"><h2 id={heading}>{title}</h2><button type="button" onClick={onClose} disabled={busy} className="workspace-icon-button" aria-label={t('common_close')}><X size={18} /></button></div>
    {children}
  </dialog>;
}

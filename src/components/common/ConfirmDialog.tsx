'use client';
import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useT } from '../../lib/i18n';
import Modal from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  isPending?: boolean;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}
export default function ConfirmDialog({ title, message, isPending, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  const t = useT();
  return <Modal title={title} onClose={onCancel} busy={isPending} initialFocus="cancel">
    <div className="workspace-confirm-message"><AlertTriangle size={22} /><p>{message}</p></div>
    <div className="workspace-modal-actions">
      <button type="button" data-modal-cancel onClick={onCancel} disabled={isPending} className="dashboard-secondary-button">{t('common_cancel')}</button>
      <button type="button" data-testid="confirm-dialog-confirm-btn" onClick={onConfirm} disabled={isPending} className="dashboard-danger-button">{isPending && <Loader2 size={15} className="animate-spin" />}{isPending ? t('common_processing') : confirmLabel ?? t('common_delete')}</button>
    </div>
  </Modal>;
}
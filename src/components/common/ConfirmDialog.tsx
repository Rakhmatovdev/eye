'use client';
import React from 'react';
import { useT } from '../../lib/i18n';

interface ConfirmDialogProps {
  title: string;
  message: string;
  isPending?: boolean;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// Small reusable "are you sure?" modal for destructive actions (delete
// entity, delete case, ...). Uses the shared i18n dictionary for the
// Confirm/Cancel button labels; the title/message are passed in per-call
// site since they're contextual (page-body copy, not chrome).
export default function ConfirmDialog({
  title,
  message,
  isPending,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm bg-[#0c0e17] border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold font-mono uppercase tracking-wide text-white">{title}</h2>
        <p className="text-xs text-gray-400 font-mono leading-relaxed">{message}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold font-mono disabled:opacity-40 transition-all"
          >
            {isPending ? '...' : confirmLabel ?? t('common_delete')}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-500 hover:text-gray-300 rounded-xl text-xs font-semibold font-mono transition-all"
          >
            {t('common_cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

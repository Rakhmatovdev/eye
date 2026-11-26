'use client';
import React from 'react';
import { Paperclip, X } from 'lucide-react';
import { useT } from '../../lib/i18n';
import AttachmentsPanel from './AttachmentsPanel';
import type { AttachmentSubject } from '../../lib/api';

interface AttachmentsModalProps {
  title: string;
  subjectType: AttachmentSubject;
  subjectId: string;
  onClose: () => void;
}

// Same modal chrome as ReportModal — used where the subject (a case) has no
// dedicated detail page to host an inline AttachmentsPanel section, unlike
// the entity dossier page.
export default function AttachmentsModal({ title, subjectType, subjectId, onClose }: AttachmentsModalProps) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div data-testid="attachments-modal" className="w-full max-w-lg max-h-[85vh] bg-[var(--bg-card)] border border-[var(--chrome-border-800)] rounded-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Paperclip size={16} className="text-[var(--accent-cyan-soft)]" />
            <h2 className="text-sm font-bold font-mono uppercase tracking-wide text-[var(--chrome-text-white)]">{title}</h2>
          </div>
          <button onClick={onClose} className="text-[var(--chrome-text-600)] hover:text-[var(--chrome-text-300)] shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AttachmentsPanel subjectType={subjectType} subjectId={subjectId} />
        </div>

        <div className="px-6 py-3 border-t border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[var(--chrome-text-500)] hover:text-[var(--chrome-text-300)] rounded-xl text-xxs font-semibold font-mono transition-all"
          >
            {t('common_close')}
          </button>
        </div>
      </div>
    </div>
  );
}

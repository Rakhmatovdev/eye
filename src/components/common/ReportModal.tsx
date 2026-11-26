'use client';
import React, { useState } from 'react';
import { X, Download, FileText, AlertCircle, FileDown, Table } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { parseMiniMarkdown, type MdBlock } from '../../lib/miniMarkdown';
import { triggerDownload } from '../../lib/download';

interface ReportModalProps {
  title: string;
  filename: string;
  markdown: string | null;
  generatedAt?: string;
  isLoading?: boolean;
  isError?: boolean;
  onClose: () => void;
  // Backend-rendered exports (GET .../report/pdf, .../report/csv) — real
  // server-side output from the same dossier data, not a client re-render.
  onDownloadPdf?: () => Promise<Blob>;
  onDownloadCsv?: () => Promise<Blob>;
}

// Bold-only inline formatting (`**text**`) — the report bodies from the
// backend (see /entities/:id/report, /cases/:id/report) only ever use bold
// for emphasis, so that's the one inline rule this hand-rolled renderer
// needs to support.
function renderInline(text: string, keyPrefix: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`} className="text-[var(--chrome-text-200)] font-bold">{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

// Groups adjacent `li`/`table` blocks into <ul>/<table> wrappers, otherwise
// renders each block as-is. See lib/miniMarkdown.ts for the parse step.
function MarkdownBody({ blocks }: { blocks: MdBlock[] }) {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.kind === 'li') {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].kind === 'li') {
        items.push((blocks[i] as { kind: 'li'; text: string }).text);
        i += 1;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2">
          {items.map((t, idx) => (
            <li key={idx} className="text-xs text-[var(--chrome-text-300)] font-mono leading-relaxed">{renderInline(t, `li-${i}-${idx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }
    if (b.kind === 'table') {
      const rows: string[][] = [];
      while (i < blocks.length && blocks[i].kind === 'table') {
        rows.push((blocks[i] as { kind: 'table'; cells: string[] }).cells);
        i += 1;
      }
      const [head, ...body] = rows;
      nodes.push(
        <div key={`table-${i}`} className="my-3 overflow-x-auto border border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] rounded-xl">
          <table className="w-full text-xxs font-mono">
            {head && (
              <thead>
                <tr className="bg-[color-mix(in_srgb,var(--bg-elevated)_60%,transparent)] text-[var(--chrome-text-400)] uppercase tracking-wide">
                  {head.map((c, idx) => <th key={idx} className="text-left px-3 py-2 border-b border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)]">{c}</th>)}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row, ridx) => (
                <tr key={ridx} className="border-b border-[color-mix(in_srgb,var(--chrome-border-800)_40%,transparent)] last:border-0">
                  {row.map((c, cidx) => <td key={cidx} className="px-3 py-2 text-[var(--chrome-text-300)]">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (b.kind === 'hr') {
      nodes.push(<hr key={`hr-${i}`} className="border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] my-3" />);
      i += 1;
      continue;
    }
    if (b.kind === 'h1') {
      nodes.push(<h1 key={`h-${i}`} className="text-lg font-bold font-mono text-[var(--chrome-text-white)] mt-4 mb-2">{renderInline(b.text, `h1-${i}`)}</h1>);
      i += 1;
      continue;
    }
    if (b.kind === 'h2') {
      nodes.push(<h2 key={`h-${i}`} className="text-sm font-bold font-mono text-[var(--accent-cyan-soft)] mt-4 mb-1.5 uppercase tracking-wide">{renderInline(b.text, `h2-${i}`)}</h2>);
      i += 1;
      continue;
    }
    if (b.kind === 'h3') {
      nodes.push(<h3 key={`h-${i}`} className="text-xs font-bold font-mono text-[var(--chrome-text-200)] mt-3 mb-1">{renderInline(b.text, `h3-${i}`)}</h3>);
      i += 1;
      continue;
    }
    // paragraph
    nodes.push(<p key={`p-${i}`} className="text-xs text-[var(--chrome-text-400)] font-mono leading-relaxed my-1.5">{renderInline(b.text, `p-${i}`)}</p>);
    i += 1;
  }
  return <>{nodes}</>;
}

export default function ReportModal({ title, filename, markdown, generatedAt, isLoading, isError, onClose, onDownloadPdf, onDownloadCsv }: ReportModalProps) {
  const t = useT();
  const [pdfPending, setPdfPending] = useState(false);
  const [csvPending, setCsvPending] = useState(false);

  const handleDownload = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    triggerDownload(blob, filename);
  };

  const blocks = markdown ? parseMiniMarkdown(markdown) : [];

  const handleDownloadPdf = async () => {
    if (!onDownloadPdf || pdfPending) return;
    setPdfPending(true);
    try {
      const blob = await onDownloadPdf();
      triggerDownload(blob, filename.replace(/\.md$/, '.pdf'));
    } finally {
      setPdfPending(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (!onDownloadCsv || csvPending) return;
    setCsvPending(true);
    try {
      const blob = await onDownloadCsv();
      triggerDownload(blob, filename.replace(/\.md$/, '.csv'));
    } finally {
      setCsvPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div data-testid="report-modal" className="w-full max-w-2xl max-h-[85vh] bg-[var(--bg-card)] border border-[var(--chrome-border-800)] rounded-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[var(--accent-cyan-soft)]" />
            <div>
              <h2 className="text-sm font-bold font-mono uppercase tracking-wide text-[var(--chrome-text-white)]">{title}</h2>
              {generatedAt && (
                <p className="text-[10px] text-[var(--chrome-text-500)] font-mono mt-0.5">{t('report_generated_prefix')} {new Date(generatedAt).toLocaleString()}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--chrome-text-600)] hover:text-[var(--chrome-text-300)] shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <p className="text-xs text-[var(--chrome-text-500)] font-mono text-center py-8">{t('report_loading')}</p>
          )}
          {isError && !isLoading && (
            <div className="flex flex-col items-center gap-2 text-[var(--chrome-text-500)] py-8">
              <AlertCircle size={22} />
              <p className="text-xs font-mono">{t('report_error')}</p>
            </div>
          )}
          {!isLoading && !isError && markdown && <MarkdownBody blocks={blocks} />}
        </div>

        <div className="px-6 py-3 border-t border-[color-mix(in_srgb,var(--chrome-border-800)_60%,transparent)] flex items-center gap-2 shrink-0">
          <button
            data-testid="report-download-btn"
            onClick={handleDownload}
            disabled={!markdown}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xxs font-bold font-mono disabled:opacity-40 transition-all"
          >
            <Download size={12} /> {t('report_download_btn')}
          </button>
          {onDownloadPdf && (
            <button
              data-testid="report-download-pdf-btn"
              onClick={handleDownloadPdf}
              disabled={!markdown || pdfPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] hover:border-cyan-500/50 text-[var(--chrome-text-300)] rounded-xl text-xxs font-bold font-mono disabled:opacity-40 transition-all"
            >
              <FileDown size={12} /> {t('report_download_pdf_btn')}
            </button>
          )}
          {onDownloadCsv && (
            <button
              data-testid="report-download-csv-btn"
              onClick={handleDownloadCsv}
              disabled={!markdown || csvPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--chrome-border-800)] hover:border-cyan-500/50 text-[var(--chrome-text-300)] rounded-xl text-xxs font-bold font-mono disabled:opacity-40 transition-all"
            >
              <Table size={12} /> {t('report_download_csv_btn')}
            </button>
          )}
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

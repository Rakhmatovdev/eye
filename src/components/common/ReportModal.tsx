'use client';
import React from 'react';
import { X, Download, FileText, AlertCircle } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { parseMiniMarkdown, type MdBlock } from '../../lib/miniMarkdown';

interface ReportModalProps {
  title: string;
  filename: string;
  markdown: string | null;
  generatedAt?: string;
  isLoading?: boolean;
  isError?: boolean;
  onClose: () => void;
}

// Bold-only inline formatting (`**text**`) — the report bodies from the
// backend (see /entities/:id/report, /cases/:id/report) only ever use bold
// for emphasis, so that's the one inline rule this hand-rolled renderer
// needs to support.
function renderInline(text: string, keyPrefix: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`} className="text-gray-200 font-bold">{part.slice(2, -2)}</strong>;
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
            <li key={idx} className="text-xs text-gray-300 font-mono leading-relaxed">{renderInline(t, `li-${i}-${idx}`)}</li>
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
        <div key={`table-${i}`} className="my-3 overflow-x-auto border border-gray-800/60 rounded-xl">
          <table className="w-full text-xxs font-mono">
            {head && (
              <thead>
                <tr className="bg-gray-900/60 text-gray-400 uppercase tracking-wide">
                  {head.map((c, idx) => <th key={idx} className="text-left px-3 py-2 border-b border-gray-800/60">{c}</th>)}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row, ridx) => (
                <tr key={ridx} className="border-b border-gray-800/40 last:border-0">
                  {row.map((c, cidx) => <td key={cidx} className="px-3 py-2 text-gray-300">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (b.kind === 'hr') {
      nodes.push(<hr key={`hr-${i}`} className="border-gray-800/60 my-3" />);
      i += 1;
      continue;
    }
    if (b.kind === 'h1') {
      nodes.push(<h1 key={`h-${i}`} className="text-lg font-bold font-mono text-white mt-4 mb-2">{renderInline(b.text, `h1-${i}`)}</h1>);
      i += 1;
      continue;
    }
    if (b.kind === 'h2') {
      nodes.push(<h2 key={`h-${i}`} className="text-sm font-bold font-mono text-cyan-400 mt-4 mb-1.5 uppercase tracking-wide">{renderInline(b.text, `h2-${i}`)}</h2>);
      i += 1;
      continue;
    }
    if (b.kind === 'h3') {
      nodes.push(<h3 key={`h-${i}`} className="text-xs font-bold font-mono text-gray-200 mt-3 mb-1">{renderInline(b.text, `h3-${i}`)}</h3>);
      i += 1;
      continue;
    }
    // paragraph
    nodes.push(<p key={`p-${i}`} className="text-xs text-gray-400 font-mono leading-relaxed my-1.5">{renderInline(b.text, `p-${i}`)}</p>);
    i += 1;
  }
  return <>{nodes}</>;
}

export default function ReportModal({ title, filename, markdown, generatedAt, isLoading, isError, onClose }: ReportModalProps) {
  const t = useT();

  const handleDownload = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const blocks = markdown ? parseMiniMarkdown(markdown) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div data-testid="report-modal" className="w-full max-w-2xl max-h-[85vh] bg-[#0c0e17] border border-gray-800 rounded-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold font-mono uppercase tracking-wide text-white">{title}</h2>
              {generatedAt && (
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{t('report_generated_prefix')} {new Date(generatedAt).toLocaleString()}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <p className="text-xs text-gray-500 font-mono text-center py-8">{t('report_loading')}</p>
          )}
          {isError && !isLoading && (
            <div className="flex flex-col items-center gap-2 text-gray-500 py-8">
              <AlertCircle size={22} />
              <p className="text-xs font-mono">{t('report_error')}</p>
            </div>
          )}
          {!isLoading && !isError && markdown && <MarkdownBody blocks={blocks} />}
        </div>

        <div className="px-6 py-3 border-t border-gray-800/60 flex items-center gap-2 shrink-0">
          <button
            data-testid="report-download-btn"
            onClick={handleDownload}
            disabled={!markdown}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xxs font-bold font-mono disabled:opacity-40 transition-all"
          >
            <Download size={12} /> {t('report_download_btn')}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-gray-500 hover:text-gray-300 rounded-xl text-xxs font-semibold font-mono transition-all"
          >
            {t('common_close')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tiny, dependency-free markdown → block parser used to render backend
// report markdown (entities/:id/report, cases/:id/report) without pulling in
// a markdown library. Deliberately narrow: headings (# / ## / ###), unordered
// list items (- / *), pipe tables (| a | b |, separator rows skipped), a
// horizontal rule (---), and everything else as a paragraph. Inline **bold**
// is resolved separately by the renderer (see ReportModal.tsx) so this stays
// a pure, easily-testable string -> data transform.
export type MdBlock =
  | { kind: 'h1' | 'h2' | 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'li'; text: string }
  | { kind: 'table'; cells: string[] }
  | { kind: 'hr' };

const TABLE_SEPARATOR_RE = /^\|?[\s:|-]+\|?$/;

function isTableSeparator(line: string): boolean {
  return line.includes('|') && TABLE_SEPARATOR_RE.test(line);
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

export function parseMiniMarkdown(md: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const lines = (md || '').split('\n');

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed === '') continue;

    if (trimmed === '---' || trimmed === '***') {
      blocks.push({ kind: 'hr' });
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ kind: 'h3', text: trimmed.slice(4) });
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ kind: 'h2', text: trimmed.slice(3) });
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ kind: 'h1', text: trimmed.slice(2) });
      continue;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push({ kind: 'li', text: trimmed.slice(2) });
      continue;
    }
    if (trimmed.startsWith('|')) {
      if (isTableSeparator(trimmed)) continue;
      blocks.push({ kind: 'table', cells: parseTableRow(trimmed) });
      continue;
    }
    blocks.push({ kind: 'p', text: trimmed });
  }

  return blocks;
}

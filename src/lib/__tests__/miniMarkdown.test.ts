import { parseMiniMarkdown } from '../miniMarkdown';

describe('parseMiniMarkdown()', () => {
  it('parses headings of all three levels', () => {
    const blocks = parseMiniMarkdown('# Title\n## Section\n### Sub');
    expect(blocks).toEqual([
      { kind: 'h1', text: 'Title' },
      { kind: 'h2', text: 'Section' },
      { kind: 'h3', text: 'Sub' },
    ]);
  });

  it('parses unordered list items with - or * markers', () => {
    const blocks = parseMiniMarkdown('- first\n* second');
    expect(blocks).toEqual([
      { kind: 'li', text: 'first' },
      { kind: 'li', text: 'second' },
    ]);
  });

  it('skips blank lines and horizontal rules', () => {
    const blocks = parseMiniMarkdown('para one\n\n---\n\npara two');
    expect(blocks).toEqual([
      { kind: 'p', text: 'para one' },
      { kind: 'hr' },
      { kind: 'p', text: 'para two' },
    ]);
  });

  it('parses pipe table rows and skips the separator row', () => {
    const md = '| Time | Sensor |\n|---|---|\n| 12:00 | cam-001 |';
    const blocks = parseMiniMarkdown(md);
    expect(blocks).toEqual([
      { kind: 'table', cells: ['Time', 'Sensor'] },
      { kind: 'table', cells: ['12:00', 'cam-001'] },
    ]);
  });

  it('treats unrecognized lines as paragraphs', () => {
    expect(parseMiniMarkdown('just some text')).toEqual([{ kind: 'p', text: 'just some text' }]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseMiniMarkdown('')).toEqual([]);
  });
});

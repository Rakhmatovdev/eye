import { scoreColorClass, scoreBarColorClass } from '../patternUi';

describe('scoreColorClass()', () => {
  it('returns red for high scores (>=75)', () => {
    expect(scoreColorClass(85)).toBe('text-red-400');
    expect(scoreColorClass(75)).toBe('text-red-400');
  });

  it('returns amber for medium scores (50-74)', () => {
    expect(scoreColorClass(64)).toBe('text-amber-400');
    expect(scoreColorClass(50)).toBe('text-amber-400');
  });

  it('returns emerald for low scores (<50)', () => {
    expect(scoreColorClass(30)).toBe('text-emerald-400');
    expect(scoreColorClass(0)).toBe('text-emerald-400');
  });
});

describe('scoreBarColorClass()', () => {
  it('mirrors the same thresholds as scoreColorClass with bg- classes', () => {
    expect(scoreBarColorClass(85)).toBe('bg-red-500');
    expect(scoreBarColorClass(64)).toBe('bg-amber-500');
    expect(scoreBarColorClass(30)).toBe('bg-emerald-500');
  });
});

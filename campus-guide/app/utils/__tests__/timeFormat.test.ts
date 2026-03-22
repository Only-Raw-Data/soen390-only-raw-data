import { formatHourLabel } from '../timeFormat';

describe('formatHourLabel', () => {
  it('formats midnight as 12 AM', () => {
    expect(formatHourLabel(0)).toBe('12 AM');
  });

  it('formats noon as 12 PM', () => {
    expect(formatHourLabel(12)).toBe('12 PM');
  });

  it('formats morning hours as AM', () => {
    expect(formatHourLabel(8)).toBe('8 AM');
    expect(formatHourLabel(11)).toBe('11 AM');
  });

  it('formats afternoon/evening hours as PM', () => {
    expect(formatHourLabel(13)).toBe('1 PM');
    expect(formatHourLabel(17)).toBe('5 PM');
    expect(formatHourLabel(23)).toBe('11 PM');
  });

  it('formats 1 AM correctly', () => {
    expect(formatHourLabel(1)).toBe('1 AM');
  });
});

import { buildHourSlots } from '../timeSlots';

describe('buildHourSlots', () => {
  it('builds slots starting from given hour', () => {
    expect(buildHourSlots(8, 4)).toEqual([8, 9, 10, 11]);
  });

  it('builds 12 slots starting from hour 8', () => {
    const slots = buildHourSlots(8, 12);
    expect(slots).toHaveLength(12);
    expect(slots[0]).toBe(8);
    expect(slots[11]).toBe(19);
  });

  it('returns empty array for count 0', () => {
    expect(buildHourSlots(8, 0)).toEqual([]);
  });

  it('builds slots starting from hour 0', () => {
    expect(buildHourSlots(0, 3)).toEqual([0, 1, 2]);
  });
});

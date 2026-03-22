export function buildHourSlots(
  startHour24: number,
  slotCount: number,
): number[] {
  const safeSlotCount = Math.max(0, slotCount);

  return Array.from({ length: safeSlotCount }, (_, index) => startHour24 + index);
}


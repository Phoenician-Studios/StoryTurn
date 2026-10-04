/**
 * Pick the reader for night index `n` from a rotation list.
 * Index 0 is the first night on/after the schedule start date.
 */
export function readerForNightIndex(
  rotationMemberIds: string[],
  nightIndex: number,
): string {
  if (rotationMemberIds.length === 0) {
    throw new Error("Rotation must include at least one reader");
  }
  if (!Number.isInteger(nightIndex) || nightIndex < 0) {
    throw new Error("nightIndex must be a non-negative integer");
  }
  return rotationMemberIds[nightIndex % rotationMemberIds.length]!;
}

/** Whole calendar days between two YYYY-MM-DD dates (UTC-safe via date-only math). */
export function daysBetween(startDate: string, targetDate: string): number {
  const start = parseDateOnly(startDate);
  const target = parseDateOnly(targetDate);
  const ms = target.getTime() - start.getTime();
  return Math.floor(ms / 86_400_000);
}

export function parseDateOnly(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`Invalid date: ${date}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: string, days: number): string {
  const d = parseDateOnly(date);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateOnly(d);
}

export function readerForDate(
  rotationMemberIds: string[],
  startDate: string,
  targetDate: string,
): string {
  const index = daysBetween(startDate, targetDate);
  if (index < 0) {
    throw new Error("targetDate is before schedule startDate");
  }
  return readerForNightIndex(rotationMemberIds, index);
}

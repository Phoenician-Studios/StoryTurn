import { isValidTimezone } from "@/lib/domain/timezones";
export function assertScheduleSettings(input: {
  startDate: string;
  timeLocal: string;
  timezone: string;
  booksPerSession?: number;
  assignRandomBooks?: boolean;
}) {
  if (
    !Number.isSafeInteger(input.booksPerSession ?? 1) ||
    (input.booksPerSession ?? 1) < 1
  )
    throw new Error("Books per session must be a positive whole number");
  if (
    input.assignRandomBooks !== undefined &&
    typeof input.assignRandomBooks !== "boolean"
  )
    throw new Error("Choose whether to assign random books");
  const date = new Date(`${input.startDate}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== input.startDate
  )
    throw new Error("Enter a valid start date");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.timeLocal))
    throw new Error("Enter a valid bedtime");
  if (!isValidTimezone(input.timezone))
    throw new Error("Your device timezone could not be detected. Reload and try again.");
}

// Shuffle without replacement so a night never gets the same book twice.
export function selectRandomBooks(bookIds: string[], count: number): string[] {
  const pool = [...new Set(bookIds)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count);
}

export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return Boolean(value);
  } catch {
    return false;
  }
}

export { dateInTimezone } from "@/lib/domain/calendar-date";

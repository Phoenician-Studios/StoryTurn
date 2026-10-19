import { daysBetween, parseDateOnly } from "@/lib/domain/rotation";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Fallback when a family has not saved a schedule timezone yet. */
export const DEFAULT_FAMILY_TIMEZONE = "America/Los_Angeles";

/**
 * Calendar YYYY-MM-DD for an instant in a specific IANA timezone.
 * Session nights are family-local days; do not use UTC `formatDateOnly(new Date())`.
 */
export function formatDateOnlyInTimeZone(
  date: Date = new Date(),
  timeZone: string = DEFAULT_FAMILY_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Human-friendly calendar day for session nights and lists.
 * Prefers Today / Tomorrow / Yesterday, then weekday names nearby,
 * then "Monday, Oct 27" (no year) farther out.
 *
 * `today` defaults to "now" in `timeZone` (family schedule timezone), not UTC.
 */
export function formatRelativeDay(
  dateOrDateTime: string,
  today?: string,
  timeZone: string = DEFAULT_FAMILY_TIMEZONE,
): string {
  const day = dateOrDateTime.slice(0, 10);
  const todayKey = today ?? formatDateOnlyInTimeZone(new Date(), timeZone);
  const delta = daysBetween(todayKey, day);

  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";

  const weekday = weekdayName(day);
  if (delta > 1 && delta < 7) return weekday;
  if (delta < -1 && delta > -7) return weekday;

  return `${weekday}, ${formatMonthDay(day)}`;
}

/** Relative day plus session wall-clock time, e.g. "Tomorrow · 19:30". */
export function formatRelativeSessionWhen(
  scheduledFor: string,
  options?: { today?: string; timeZone?: string },
): string {
  const timeZone = options?.timeZone ?? DEFAULT_FAMILY_TIMEZONE;
  const time = scheduledFor.slice(11, 16);
  const day = formatRelativeDay(scheduledFor, options?.today, timeZone);
  return time ? `${day} · ${time}` : day;
}

/**
 * Relative label for a UTC ISO instant (corrections, audits), using family timezone
 * for both the day and the clock time.
 */
export function formatRelativeInstant(
  isoInstant: string,
  timeZone: string = DEFAULT_FAMILY_TIMEZONE,
): string {
  const date = new Date(isoInstant);
  if (Number.isNaN(date.getTime())) {
    return formatRelativeDay(isoInstant.slice(0, 10), undefined, timeZone);
  }
  const dayInTz = formatDateOnlyInTimeZone(date, timeZone);
  const dayLabel = formatRelativeDay(dayInTz, undefined, timeZone);
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${dayLabel} · ${timeLabel}`;
}

export function weekdayName(dateOnly: string): string {
  const d = parseDateOnly(dateOnly);
  return WEEKDAYS[d.getUTCDay()]!;
}

export function formatMonthDay(dateOnly: string): string {
  const d = parseDateOnly(dateOnly);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

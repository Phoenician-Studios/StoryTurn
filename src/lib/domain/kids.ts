import { parseDateOnly } from "@/lib/domain/rotation";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Local calendar YYYY-MM-DD for HTML date inputs.
 * Do not use UTC `formatDateOnly` here — users pick a local day.
 */
export function localDateOnly(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Validate a YYYY-MM-DD birthday (not in the future, not absurdly old). */
export function parseBirthday(raw: string, asOfLocal = localDateOnly()): string {
  const birthday = raw.trim();
  if (!DATE_ONLY.test(birthday)) {
    throw new Error("Birthday must be a date (YYYY-MM-DD)");
  }
  // Throws on invalid calendar dates (e.g. 2020-02-31).
  parseDateOnly(birthday);
  if (birthday > asOfLocal) {
    throw new Error("Birthday cannot be in the future");
  }
  if (ageFromBirthday(birthday, asOfLocal) >= 21) {
    throw new Error("Birthday must be for a child under 21");
  }
  return birthday;
}

/** Whole years completed as of `asOf` (YYYY-MM-DD, defaults to local today). */
export function ageFromBirthday(birthday: string, asOf = localDateOnly()): number {
  const born = parseDateOnly(birthday);
  const on = parseDateOnly(asOf);
  let age = on.getUTCFullYear() - born.getUTCFullYear();
  const monthDelta = on.getUTCMonth() - born.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && on.getUTCDate() < born.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/** Short display like "Mar 12" (no year). */
export function formatBirthdayLabel(birthday: string): string {
  const d = parseDateOnly(birthday);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

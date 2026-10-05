import type { SessionStatus } from "@/lib/types";
import { addDays } from "@/lib/domain/rotation";
import { sessionDateKey } from "@/lib/domain/sessions";
import { dateInTimezone } from "@/lib/domain/timezones";

export function sessionStatusFilter(
  value?: string | string[],
): SessionStatus | undefined {
  return value === "scheduled" || value === "completed" || value === "cancelled"
    ? value
    : undefined;
}

export function sessionPageBounds(total: number, requestedPage?: string | string[]) {
  const pageCount = Math.max(1, Math.ceil(total / 10));
  const parsed =
    typeof requestedPage === "string" && /^[1-9]\d*$/.test(requestedPage)
      ? Number(requestedPage)
      : 1;
  const page = Math.min(pageCount, parsed);
  const from = (page - 1) * 10;
  return { page, pageCount, total, from, to: from + 9 };
}

export function paginateSessions<T>(sessions: T[], requestedPage?: string | string[]) {
  const { page, pageCount, total, from, to } = sessionPageBounds(
    sessions.length,
    requestedPage,
  );
  return { items: sessions.slice(from, to + 1), page, pageCount, total };
}

export function upcomingSessionDay(
  scheduledFor: string,
  timezone: string,
  now = new Date(),
): string {
  const today = dateInTimezone(now, timezone);
  const day = sessionDateKey(scheduledFor);
  if (day === today) return "Tonight";
  if (day === addDays(today, 1)) return "Tomorrow";
  return formatSessionDate(scheduledFor);
}

export function formatSessionDate(scheduledFor: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${sessionDateKey(scheduledFor)}T12:00:00Z`));
}

export function sessionPageNumbers(
  page: number,
  pageCount: number,
): (number | "ellipsis")[] {
  const visible = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...visible]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  pages.forEach((n, i) => {
    const previous = pages[i - 1];
    if (previous && n - previous === 2) result.push(previous + 1);
    else if (previous && n - previous > 2) result.push("ellipsis");
    result.push(n);
  });
  return result;
}

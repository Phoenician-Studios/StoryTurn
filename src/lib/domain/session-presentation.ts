import { addDays } from "@/lib/domain/rotation";
import { sessionDateKey } from "@/lib/domain/sessions";
import { dateInTimezone } from "@/lib/domain/timezones";

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
  return day;
}

import { addDays } from "@/lib/domain/rotation";
import { sessionDateKey } from "@/lib/domain/sessions";
import { dateInTimezone } from "@/lib/domain/timezones";

export function paginateSessions<T>(sessions: T[], requestedPage?: string | string[]) {
  const total = sessions.length;
  const pageCount = Math.max(1, Math.ceil(total / 10));
  const parsed =
    typeof requestedPage === "string" && /^[1-9]\d*$/.test(requestedPage)
      ? Number(requestedPage)
      : 1;
  const page = Math.min(pageCount, parsed);
  return { items: sessions.slice((page - 1) * 10, page * 10), page, pageCount, total };
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

import { isValidTimezone } from "@/lib/domain/timezones";
export function assertScheduleSettings(input: {
  startDate: string;
  timeLocal: string;
  timezone: string;
}) {
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

import { describe, expect, it } from "vitest";
import {
  formatDateOnlyInTimeZone,
  formatMonthDay,
  formatRelativeDay,
  formatRelativeInstant,
  formatRelativeSessionWhen,
  weekdayName,
} from "@/lib/domain/dates";

describe("formatRelativeDay", () => {
  const today = "2026-10-18"; // Sunday

  it("labels today, tomorrow, and yesterday", () => {
    expect(formatRelativeDay("2026-10-18", today)).toBe("Today");
    expect(formatRelativeDay("2026-10-19T19:30:00", today)).toBe("Tomorrow");
    expect(formatRelativeDay("2026-10-17", today)).toBe("Yesterday");
  });

  it("uses weekday names within the coming week", () => {
    expect(formatRelativeDay("2026-10-20", today)).toBe("Tuesday");
    expect(formatRelativeDay("2026-10-21", today)).toBe("Wednesday");
    expect(formatRelativeDay("2026-10-24", today)).toBe("Saturday");
  });

  it("uses weekday names within the past week", () => {
    expect(formatRelativeDay("2026-10-16", today)).toBe("Friday");
    expect(formatRelativeDay("2026-10-13", today)).toBe("Tuesday");
  });

  it("falls back to weekday plus month day farther out", () => {
    expect(formatRelativeDay("2026-10-25", today)).toBe("Sunday, Oct 25");
    expect(formatRelativeDay("2026-11-02", today)).toBe("Monday, Nov 2");
  });
});

describe("formatDateOnlyInTimeZone", () => {
  it("uses family timezone, not UTC, for local calendar day", () => {
    // 2026-10-19 05:30 UTC is still Oct 18 evening in America/Los_Angeles
    const eveningPt = new Date("2026-10-19T05:30:00.000Z");
    expect(formatDateOnlyInTimeZone(eveningPt, "America/Los_Angeles")).toBe(
      "2026-10-18",
    );
    expect(formatDateOnlyInTimeZone(eveningPt, "UTC")).toBe("2026-10-19");
  });
});

describe("formatRelativeSessionWhen", () => {
  it("includes the bedtime", () => {
    expect(
      formatRelativeSessionWhen("2026-10-19T19:30:00", {
        today: "2026-10-18",
      }),
    ).toBe("Tomorrow · 19:30");
  });

  it("keeps tonight as Today when family TZ is still the previous UTC day", () => {
    const eveningPt = new Date("2026-10-19T05:30:00.000Z");
    const todayPt = formatDateOnlyInTimeZone(eveningPt, "America/Los_Angeles");
    expect(todayPt).toBe("2026-10-18");
    expect(
      formatRelativeDay("2026-10-18T19:30:00", todayPt, "America/Los_Angeles"),
    ).toBe("Today");
    expect(
      formatRelativeDay("2026-10-18T19:30:00", "2026-10-19", "UTC"),
    ).toBe("Yesterday");
  });
});

describe("formatRelativeInstant", () => {
  it("formats correction clock times in the family timezone", () => {
    // 15:00 UTC on Oct 18 → 08:00 in America/Los_Angeles
    const label = formatRelativeInstant(
      "2026-10-18T15:00:00.000Z",
      "America/Los_Angeles",
    );
    expect(label.endsWith("08:00")).toBe(true);
    expect(label.includes("T15:00")).toBe(false);
  });
});

describe("weekday helpers", () => {
  it("names weekdays and month days without year", () => {
    expect(weekdayName("2026-10-18")).toBe("Sunday");
    expect(formatMonthDay("2026-10-18")).toBe("Oct 18");
  });
});

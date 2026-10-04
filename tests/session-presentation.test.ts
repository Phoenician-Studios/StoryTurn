import { expect, it } from "vitest";
import { paginateSessions, upcomingSessionDay } from "@/lib/domain/session-presentation";
it("paginates all nights into groups of ten", () => {
  const nights = Array.from({ length: 25 }, (_, i) => i);
  expect(paginateSessions(nights, "1").items).toEqual(nights.slice(0, 10));
  expect(paginateSessions(nights, "2").items).toEqual(nights.slice(10, 20));
  expect(paginateSessions(nights, "3")).toMatchObject({
    items: nights.slice(20),
    page: 3,
    pageCount: 3,
    total: 25,
  });
});
it("handles empty lists and clamps invalid or out-of-range page requests", () => {
  expect(paginateSessions([], "99")).toMatchObject({ items: [], page: 1, pageCount: 1 });
  for (const value of [undefined, "0", "-1", "nope", "2foo", "1.5", ["2", "3"]])
    expect(paginateSessions([1, 2], value).page).toBe(1);
  expect(paginateSessions(Array.from({ length: 11 }), "999").page).toBe(2);
});
it("uses Tonight and Tomorrow in the family's timezone, including UTC midnight", () => {
  const now = new Date("2026-10-05T02:00:00Z");
  expect(upcomingSessionDay("2026-10-04T19:30:00", "America/Chicago", now)).toBe(
    "Tonight",
  );
  expect(upcomingSessionDay("2026-10-05T19:30:00", "America/Chicago", now)).toBe(
    "Tomorrow",
  );
  expect(upcomingSessionDay("2026-10-06T19:30:00", "America/Chicago", now)).toBe(
    "2026-10-06",
  );
});
it("uses calendar days across month, year, and daylight-saving transitions", () => {
  expect(
    upcomingSessionDay("2027-01-01T19:30:00", "UTC", new Date("2026-12-31T23:30Z")),
  ).toBe("Tomorrow");
  expect(
    upcomingSessionDay(
      "2026-03-09T19:30:00",
      "America/Chicago",
      new Date("2026-03-08T06:30Z"),
    ),
  ).toBe("Tomorrow");
  expect(
    upcomingSessionDay(
      "2026-11-02T19:30:00",
      "America/Chicago",
      new Date("2026-11-01T05:30Z"),
    ),
  ).toBe("Tomorrow");
  expect(
    upcomingSessionDay(
      "2026-10-05T19:30:00",
      "Asia/Tokyo",
      new Date("2026-10-04T18:00Z"),
    ),
  ).toBe("Tonight");
});

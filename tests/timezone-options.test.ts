import { afterEach, expect, it, vi } from "vitest";
import { timezoneOptions } from "@/lib/domain/timezones";
afterEach(() => vi.restoreAllMocks());
it("reuses timezone labels when the selected timezone changes", () => {
  const first = timezoneOptions(["America/Chicago"]);
  const formatter = vi.spyOn(Intl.DateTimeFormat.prototype, "formatToParts");
  const second = timezoneOptions(["Asia/Tokyo"]);
  expect(second).toEqual(first);
  expect(formatter.mock.calls.length).toBeLessThan(5);
});
it("keeps validated saved aliases alongside the cached worldwide choices", () => {
  const options = timezoneOptions(["US/Central", "invalid-zone"]);
  expect(options.some((o) => o.value === "US/Central")).toBe(true);
  expect(options.some((o) => o.value === "invalid-zone")).toBe(false);
  expect(new Set(options.map((o) => o.value)).size).toBe(options.length);
});

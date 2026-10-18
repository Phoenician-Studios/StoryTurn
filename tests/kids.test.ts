import { describe, expect, it } from "vitest";
import {
  ageFromBirthday,
  formatBirthdayLabel,
  localDateOnly,
  parseBirthday,
} from "@/lib/domain/kids";

describe("kids birthdays", () => {
  it("computes age from birthday before and after the anniversary", () => {
    expect(ageFromBirthday("2020-03-12", "2026-03-11")).toBe(5);
    expect(ageFromBirthday("2020-03-12", "2026-03-12")).toBe(6);
  });

  it("formats a readable birthday label in UTC", () => {
    expect(formatBirthdayLabel("2022-08-04")).toBe("Aug 4, 2022");
  });

  it("rejects future and invalid birthdays", () => {
    expect(() => parseBirthday("not-a-date")).toThrow(/YYYY-MM-DD/);
    expect(() => parseBirthday("2099-01-01", "2026-10-18")).toThrow(/future/);
    expect(() => parseBirthday("1990-01-01", "2026-10-18")).toThrow(/under 21/);
  });

  it("accepts a valid child birthday", () => {
    expect(parseBirthday("2022-08-04", "2026-10-18")).toBe("2022-08-04");
  });

  it("allows local today even when that calendar day is ahead of UTC", () => {
    // HTML date inputs are local days; comparing to UTC "today" would reject this.
    expect(parseBirthday("2026-10-19", "2026-10-19")).toBe("2026-10-19");
    expect(() => parseBirthday("2026-10-19", "2026-10-18")).toThrow(/future/);
  });

  it("formats local calendar dates from Date local getters", () => {
    const localNoon = new Date(2026, 9, 19, 12, 0, 0); // Oct 19 local
    expect(localDateOnly(localNoon)).toBe("2026-10-19");
  });
});

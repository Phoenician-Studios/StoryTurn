import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  readerForDate,
  readerForNightIndex,
} from "@/lib/domain/rotation";

describe("readerForNightIndex", () => {
  it("alternates two readers", () => {
    expect(readerForNightIndex(["a", "b"], 0)).toBe("a");
    expect(readerForNightIndex(["a", "b"], 1)).toBe("b");
    expect(readerForNightIndex(["a", "b"], 2)).toBe("a");
  });

  it("supports grandparents in a longer rotation", () => {
    expect(readerForNightIndex(["a", "b", "nana"], 2)).toBe("nana");
    expect(readerForNightIndex(["a", "b", "nana"], 5)).toBe("nana");
  });

  it("rejects empty rotation", () => {
    expect(() => readerForNightIndex([], 0)).toThrow(/at least one/);
  });
});

describe("readerForDate", () => {
  it("maps calendar nights from start date", () => {
    expect(readerForDate(["alex", "jordan"], "2026-10-01", "2026-10-01")).toBe(
      "alex",
    );
    expect(readerForDate(["alex", "jordan"], "2026-10-01", "2026-10-02")).toBe(
      "jordan",
    );
  });

  it("computes day gaps", () => {
    expect(daysBetween("2026-10-01", "2026-10-04")).toBe(3);
    expect(addDays("2026-10-01", 3)).toBe("2026-10-04");
  });
});

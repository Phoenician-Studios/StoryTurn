import { expect, it } from "vitest";
import { normalizeIsbn } from "@/lib/isbn";
it("normalizes ISBN-10 including X and validates book-only ISBN-13 checksums", () => {
  expect(normalizeIsbn("0-06-077585-8")).toBe("9780060775858");
  expect(normalizeIsbn("080442957X")).toBe("9780804429573");
  expect(normalizeIsbn("9780060775858")).toBe("9780060775858");
  for (const value of [
    "9780060775859",
    "0060775859",
    "12345",
    "012345678905",
    "4006381333931",
    "ISBN: 9780060775858",
  ])
    expect(normalizeIsbn(value)).toBeNull();
});

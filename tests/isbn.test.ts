import { describe, expect, it } from "vitest";
import {
  compactBookCode,
  isbn10ToIsbn13,
  looksLikeBookCode,
  normalizeIsbn,
  normalizeToIsbn13,
} from "@/lib/isbn";

describe("normalizeIsbn (strict bookland)", () => {
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
});

describe("compactBookCode", () => {
  it("strips hyphens and spaces", () => {
    expect(compactBookCode("978-0-06-077585-8")).toBe("9780060775858");
    expect(compactBookCode(" 978 0060775858 ")).toBe("9780060775858");
  });
});

describe("looksLikeBookCode", () => {
  it("detects ISBN-13, UPC-A, and ISBN-10 shapes", () => {
    expect(looksLikeBookCode("9780060775858")).toBe(true);
    expect(looksLikeBookCode("978-0-06-077585-8")).toBe(true);
    expect(looksLikeBookCode("0060775854")).toBe(true);
    expect(looksLikeBookCode("123456789012")).toBe(true);
  });

  it("rejects title/author queries", () => {
    expect(looksLikeBookCode("goodnight moon")).toBe(false);
    expect(looksLikeBookCode("Margaret Wise Brown")).toBe(false);
    expect(looksLikeBookCode("978")).toBe(false);
  });
});

describe("normalizeToIsbn13", () => {
  it("passes through Bookland ISBN-13", () => {
    expect(normalizeToIsbn13("978-0-06-077585-8")).toBe("9780060775858");
    expect(normalizeToIsbn13("9791234567896")).toBe("9791234567896");
  });

  it("converts ISBN-10 to ISBN-13", () => {
    expect(isbn10ToIsbn13("0060775854")).toBe("9780060775858");
    expect(normalizeToIsbn13("0-06-077585-4")).toBe("9780060775858");
  });

  it("appends check digit when Bookland UPC is missing it", () => {
    expect(normalizeToIsbn13("978006077585")).toBe("9780060775858");
  });

  it("rejects non-bookland EAN/UPC", () => {
    expect(normalizeToIsbn13("0123456789012")).toBeNull();
    expect(normalizeToIsbn13("123456789012")).toBeNull();
  });
});

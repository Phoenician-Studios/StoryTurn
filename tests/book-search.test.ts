import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupBookByCode, searchBooks } from "@/lib/book-search";

afterEach(() => {
  vi.unstubAllEnvs();
  delete process.env.GOOGLE_BOOKS_API_KEY;
});

describe("lookupBookByCode waterfall", () => {
  it("prefers Google Books when an API key is configured", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "test-key";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "g1",
            volumeInfo: {
              title: "Modern Kids Book",
              authors: ["A Author"],
              industryIdentifiers: [
                { type: "ISBN_13", identifier: "9780060775858" },
              ],
            },
          },
        ],
      }),
    });

    const book = await lookupBookByCode("9780060775858", { fetchImpl });
    expect(book?.source).toBe("google");
    expect(book?.title).toBe("Modern Kids Book");
    expect(book?.googleBooksId).toBe("g1");
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("googleapis.com");
  });

  it("falls back to Open Library ISBN when Google is unset", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        "ISBN:9780060775858": {
          title: "Goodnight Moon",
          authors: [{ name: "Margaret Wise Brown" }],
          key: "/books/OL1M",
          identifiers: { isbn_13: ["9780060775858"] },
        },
      }),
    });

    const book = await lookupBookByCode("978-0-06-077585-8", {
      fetchImpl,
      googleApiKey: null,
    });
    expect(book?.source).toBe("openlibrary");
    expect(book?.title).toBe("Goodnight Moon");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain(
      "openlibrary.org/api/books",
    );
  });

  it("falls back to Open Library text search after ISBN miss", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          docs: [
            {
              key: "/works/OL1W",
              title: "Goodnight Moon",
              author_name: ["Margaret Wise Brown"],
              isbn: ["9780060775858"],
            },
          ],
        }),
      });

    const book = await lookupBookByCode("9780060775858", {
      fetchImpl,
      googleApiKey: null,
    });
    expect(book?.title).toBe("Goodnight Moon");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain("search.json");
  });

  it("normalizes ISBN-10 before Google lookup", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "test-key";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    await lookupBookByCode("0060775854", { fetchImpl });
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain(
      "isbn%3A9780060775858",
    );
  });
});

describe("searchBooks routing", () => {
  it("routes barcode queries through code lookup", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "test-key";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "g2",
            volumeInfo: { title: "From Barcode", authors: ["X"] },
          },
        ],
      }),
    });

    const results = await searchBooks("9780060775858", { fetchImpl });
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("From Barcode");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("isbn%3A");
  });

  it("uses Open Library text search without a Google key", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        docs: [{ key: "/works/OL1W", title: "Goodnight Moon" }],
      }),
    });

    const results = await searchBooks("goodnight moon", {
      fetchImpl,
      googleApiKey: null,
    });
    expect(results[0]?.title).toBe("Goodnight Moon");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("search.json");
  });

  it("prefers Google text search when configured", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "test-key";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "g3",
            volumeInfo: { title: "Google Hit", authors: ["Y"] },
          },
        ],
      }),
    });

    const results = await searchBooks("goodnight moon", { fetchImpl });
    expect(results[0]?.source).toBe("google");
    expect(results[0]?.title).toBe("Google Hit");
  });
});

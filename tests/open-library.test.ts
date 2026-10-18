import { describe, expect, it, vi } from "vitest";
import {
  lookupOpenLibraryByIsbn,
  mapOpenLibraryDoc,
  searchOpenLibrary,
} from "@/lib/open-library";

describe("mapOpenLibraryDoc", () => {
  it("maps cover and authors", () => {
    const mapped = mapOpenLibraryDoc({
      key: "/works/OL1W",
      title: "Goodnight Moon",
      author_name: ["Margaret Wise Brown"],
      cover_i: 123,
      isbn: ["9780060775858"],
      first_publish_year: 1947,
    });
    expect(mapped.coverUrl).toContain("123-M.jpg");
    expect(mapped.authors).toEqual(["Margaret Wise Brown"]);
    expect(mapped.isbn).toBe("9780060775858");
    expect(mapped.source).toBe("openlibrary");
    expect(mapped.sourceId).toBe("/works/OL1W");
    expect(mapped.openLibraryKey).toBe("/works/OL1W");
  });
});

describe("lookupOpenLibraryByIsbn", () => {
  it("maps Books API entries", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        "ISBN:9780060775858": {
          title: "Goodnight Moon",
          authors: [{ name: "Margaret Wise Brown" }],
          cover: { medium: "https://covers.example/m.jpg" },
          key: "/books/OL1M",
          publish_date: "1947",
          identifiers: { isbn_13: ["9780060775858"] },
        },
      }),
    });

    const book = await lookupOpenLibraryByIsbn("9780060775858", { fetchImpl });
    expect(book?.title).toBe("Goodnight Moon");
    expect(book?.authors).toEqual(["Margaret Wise Brown"]);
    expect(book?.year).toBe(1947);
  });
});

describe("searchOpenLibrary", () => {
  it("returns mapped docs from the API", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        docs: [
          {
            key: "/works/OL1W",
            title: "Goodnight Moon",
            author_name: ["Margaret Wise Brown"],
          },
        ],
      }),
    });

    const results = await searchOpenLibrary("goodnight moon", { fetchImpl });
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("Goodnight Moon");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("returns empty for blank queries", async () => {
    expect(await searchOpenLibrary("   ")).toEqual([]);
  });
});

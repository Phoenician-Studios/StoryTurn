import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  reserveBookLookup: vi.fn(),
  startBookScan: vi.fn(),
  finishBookScan: vi.fn(),
  saveBookEdition: vi.fn(),
  removeLibraryBooks: vi.fn(),
  correctBookFormat: vi.fn(),
  lookupIsbn: vi.fn(),
  getWorkEditions: vi.fn(),
  lookupEdition: vi.fn(),
  isGoogleBooksConfigured: vi.fn(),
  lookupGoogleBooksByIsbn: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data", () => ({
  getCurrentMember: mocks.getCurrentMember,
  reserveBookLookup: mocks.reserveBookLookup,
  startBookScan: mocks.startBookScan,
  finishBookScan: mocks.finishBookScan,
  saveBookEdition: mocks.saveBookEdition,
  removeLibraryBooks: mocks.removeLibraryBooks,
  correctBookFormat: mocks.correctBookFormat,
}));
vi.mock("@/lib/open-library", () => ({
  lookupIsbn: mocks.lookupIsbn,
  getWorkEditions: mocks.getWorkEditions,
  lookupEdition: mocks.lookupEdition,
}));
vi.mock("@/lib/google-books", () => ({
  isGoogleBooksConfigured: mocks.isGoogleBooksConfigured,
  lookupGoogleBooksByIsbn: mocks.lookupGoogleBooksByIsbn,
}));

import { scanBookAction } from "@/app/book-actions";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const VALID_ISBN13 = "9781524793401";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentMember.mockResolvedValue({ id: "mem_1" });
  mocks.reserveBookLookup.mockResolvedValue(undefined);
  mocks.isGoogleBooksConfigured.mockReturnValue(true);
  process.env.GOOGLE_BOOKS_API_KEY = "test-key";
});

describe("scanBookAction lookup errors vs misses", () => {
  it("returns lookup kind when Open Library fails and Google is unset", async () => {
    mocks.isGoogleBooksConfigured.mockReturnValue(false);
    delete process.env.GOOGLE_BOOKS_API_KEY;
    mocks.lookupIsbn.mockRejectedValue(new Error("Open Library 503"));

    const result = await scanBookAction(VALID_ISBN13, SESSION_ID);

    expect(result).toEqual({
      ok: false,
      error: "Lookup unavailable. Retry this ISBN or search by title.",
      kind: "lookup",
    });
    expect(mocks.saveBookEdition).not.toHaveBeenCalled();
  });

  it("returns lookup kind when Google Books throws after an Open Library miss", async () => {
    mocks.lookupIsbn.mockResolvedValue(null);
    mocks.lookupGoogleBooksByIsbn.mockRejectedValue(
      new Error("Google Books search failed (503)"),
    );

    const result = await scanBookAction(VALID_ISBN13, SESSION_ID);

    expect(result).toEqual({
      ok: false,
      error: "Lookup unavailable. Retry this ISBN or search by title.",
      kind: "lookup",
    });
  });

  it("returns unknown only when providers respond with no match", async () => {
    mocks.lookupIsbn.mockResolvedValue(null);
    mocks.lookupGoogleBooksByIsbn.mockResolvedValue([]);

    const result = await scanBookAction(VALID_ISBN13, SESSION_ID);

    expect(result).toEqual({
      ok: false,
      error: "No ISBN match. Try title search.",
      kind: "unknown",
    });
  });
});

describe("scanBookAction Google fallback ISBN", () => {
  it("stores the scanned ISBN even when Google returns OTHER identifiers", async () => {
    mocks.lookupIsbn.mockResolvedValue(null);
    mocks.lookupGoogleBooksByIsbn.mockResolvedValue([
      {
        sourceId: "google:vol1",
        source: "google",
        openLibraryKey: null,
        googleBooksId: "vol1",
        title: "Good Morning, Farm Friends",
        authors: ["Annie Bach"],
        coverUrl: "https://example.com/cover.jpg",
        isbn: "U_OTHER_123",
        year: 2018,
      },
    ]);
    mocks.saveBookEdition.mockResolvedValue({
      book: { id: "book_1", title: "Good Morning, Farm Friends" },
      created: true,
    });

    const result = await scanBookAction(VALID_ISBN13, SESSION_ID);

    expect(result.ok).toBe(true);
    expect(mocks.saveBookEdition).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Good Morning, Farm Friends",
        isbn: VALID_ISBN13,
        editionKey: "google:vol1",
      }),
      SESSION_ID,
    );
  });
});

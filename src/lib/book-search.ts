import {
  lookupGoogleBooksByIsbn,
  searchGoogleBooks,
} from "@/lib/google-books";
import { looksLikeBookCode, normalizeToIsbn13 } from "@/lib/isbn";
import {
  lookupOpenLibraryByIsbn,
  searchOpenLibrary,
  type BookSearchResult,
} from "@/lib/open-library";

export type BookSearchFetch = typeof fetch;

export interface BookSearchOptions {
  limit?: number;
  fetchImpl?: BookSearchFetch;
  /** Override env key; `null` forces skipping Google Books. */
  googleApiKey?: string | null;
}

function resolveGoogleKey(options?: BookSearchOptions): string | null {
  if (options && "googleApiKey" in options) {
    return options.googleApiKey ?? null;
  }
  return process.env.GOOGLE_BOOKS_API_KEY?.trim() || null;
}

function shouldTryGoogle(options?: BookSearchOptions): boolean {
  return Boolean(resolveGoogleKey(options));
}

/**
 * Exact ISBN / barcode lookup waterfall:
 * Google Books (when configured) → Open Library ISBN → Open Library text search.
 */
export async function lookupBookByCode(
  code: string,
  options?: BookSearchOptions,
): Promise<BookSearchResult | null> {
  const isbn =
    normalizeToIsbn13(code) ??
    code.trim().replace(/[^0-9Xx]/g, "").toUpperCase();
  if (!isbn) return null;

  const fetchImpl = options?.fetchImpl;
  if (shouldTryGoogle(options)) {
    try {
      const google = await lookupGoogleBooksByIsbn(isbn, {
        limit: options?.limit ?? 1,
        fetchImpl,
        apiKey: resolveGoogleKey(options),
      });
      if (google[0]) return google[0];
    } catch {
      // Fall through to Open Library.
    }
  }

  try {
    const olIsbn = await lookupOpenLibraryByIsbn(isbn, { fetchImpl });
    if (olIsbn) return olIsbn;
  } catch {
    // Fall through to text search.
  }

  try {
    const searched = await searchOpenLibrary(isbn, {
      limit: options?.limit ?? 1,
      fetchImpl,
    });
    return searched[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Unified library search: barcode/ISBN queries use the lookup waterfall;
 * free-text title/author search prefers Google Books when configured, else
 * Open Library text search.
 */
export async function searchBooks(
  query: string,
  options?: BookSearchOptions,
): Promise<BookSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  if (looksLikeBookCode(q)) {
    const book = await lookupBookByCode(q, options);
    return book ? [book] : [];
  }

  const limit = options?.limit ?? 10;
  const fetchImpl = options?.fetchImpl;

  if (shouldTryGoogle(options)) {
    try {
      const google = await searchGoogleBooks(q, {
        limit,
        fetchImpl,
        apiKey: resolveGoogleKey(options),
      });
      if (google.length > 0) return google;
    } catch {
      // Fall through to Open Library.
    }
  }

  return searchOpenLibrary(q, { limit, fetchImpl });
}

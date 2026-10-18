export type BookSource = "openlibrary" | "google";

export interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
  first_publish_year?: number;
}

export interface BookSearchResult {
  /** Stable id for UI keys / forms (OL work key or google:volumeId). */
  sourceId: string;
  source: BookSource;
  openLibraryKey: string | null;
  googleBooksId: string | null;
  title: string;
  authors: string[];
  coverUrl: string | null;
  isbn: string | null;
  year: number | null;
}

interface OpenLibraryBooksApiEntry {
  title?: string;
  authors?: Array<{ name?: string }>;
  publish_date?: string;
  cover?: { medium?: string; large?: string; small?: string };
  identifiers?: {
    isbn_13?: string[];
    isbn_10?: string[];
    openlibrary?: string[];
  };
  key?: string;
}

export function mapOpenLibraryDoc(doc: OpenLibraryDoc): BookSearchResult {
  return {
    sourceId: doc.key,
    source: "openlibrary",
    openLibraryKey: doc.key,
    googleBooksId: null,
    title: doc.title,
    authors: doc.author_name ?? [],
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    isbn: doc.isbn?.[0] ?? null,
    year: doc.first_publish_year ?? null,
  };
}

function parsePublishYear(publishDate?: string): number | null {
  if (!publishDate) return null;
  const match = publishDate.match(/(\d{4})/);
  return match ? Number(match[1]) : null;
}

export function mapOpenLibraryBooksApiEntry(
  isbn: string,
  entry: OpenLibraryBooksApiEntry,
): BookSearchResult {
  const openLibraryKey =
    entry.key ?? entry.identifiers?.openlibrary?.[0] ?? `isbn:${isbn}`;
  return {
    sourceId: openLibraryKey,
    source: "openlibrary",
    openLibraryKey,
    googleBooksId: null,
    title: entry.title ?? "Untitled",
    authors: (entry.authors ?? [])
      .map((a) => a.name?.trim())
      .filter((name): name is string => Boolean(name)),
    coverUrl:
      entry.cover?.medium ?? entry.cover?.large ?? entry.cover?.small ?? null,
    isbn:
      entry.identifiers?.isbn_13?.[0] ??
      entry.identifiers?.isbn_10?.[0] ??
      isbn,
    year: parsePublishYear(entry.publish_date),
  };
}

export async function searchOpenLibrary(
  query: string,
  options?: { limit?: number; fetchImpl?: typeof fetch },
): Promise<BookSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const limit = options?.limit ?? 10;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set(
    "fields",
    "key,title,author_name,cover_i,isbn,first_publish_year",
  );

  const response = await fetchImpl(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  } as RequestInit);

  if (!response.ok) {
    throw new Error(`Open Library search failed (${response.status})`);
  }

  const data = (await response.json()) as { docs?: OpenLibraryDoc[] };
  return (data.docs ?? []).map(mapOpenLibraryDoc);
}

/** Lookup a single edition by ISBN via Open Library Books API. */
export async function lookupOpenLibraryByIsbn(
  isbn: string,
  options?: { fetchImpl?: typeof fetch },
): Promise<BookSearchResult | null> {
  const cleaned = isbn.trim();
  if (!cleaned) return null;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const url = new URL("https://openlibrary.org/api/books");
  url.searchParams.set("bibkeys", `ISBN:${cleaned}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("jscmd", "data");

  const response = await fetchImpl(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  } as RequestInit);

  if (!response.ok) {
    throw new Error(`Open Library ISBN lookup failed (${response.status})`);
  }

  const data = (await response.json()) as Record<
    string,
    OpenLibraryBooksApiEntry | undefined
  >;
  const entry = data[`ISBN:${cleaned}`];
  if (!entry?.title) return null;
  return mapOpenLibraryBooksApiEntry(cleaned, entry);
}

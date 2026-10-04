export interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
  first_publish_year?: number;
}

export interface BookSearchResult {
  openLibraryKey: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  isbn: string | null;
  year: number | null;
}

export function mapOpenLibraryDoc(doc: OpenLibraryDoc): BookSearchResult {
  return {
    openLibraryKey: doc.key,
    title: doc.title,
    authors: doc.author_name ?? [],
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    isbn: doc.isbn?.[0] ?? null,
    year: doc.first_publish_year ?? null,
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
  url.searchParams.set("fields", "key,title,author_name,cover_i,isbn,first_publish_year");

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

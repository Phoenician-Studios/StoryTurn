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
  options?: {
    limit?: number;
    fetchImpl?: typeof fetch;
    beforeRequest?: () => Promise<void>;
  },
): Promise<BookSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const limit = options?.limit ?? 10;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", "key,title,author_name,cover_i,isbn,first_publish_year");

  await options?.beforeRequest?.();
  const response = await fetchImpl(url.toString(), {
    headers: {
      Accept: "application/json",
      ...(process.env.OPEN_LIBRARY_CONTACT
        ? { "User-Agent": `StoryTurn (${process.env.OPEN_LIBRARY_CONTACT})` }
        : {}),
    },
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 3600 },
  } as RequestInit);

  if (!response.ok) {
    throw new Error(`Open Library search failed (${response.status})`);
  }

  const data = (await response.json()) as { docs?: OpenLibraryDoc[] };
  return (data.docs ?? []).map(mapOpenLibraryDoc);
}

export interface OpenLibraryEdition {
  key: string;
  title: string;
  authors?: { key: string }[];
  works?: { key: string }[];
  covers?: number[];
  isbn_13?: string[];
  isbn_10?: string[];
  physical_format?: string;
  publishers?: string[];
  publish_date?: string;
}
export type EditionResult = BookSearchResult &
  import("@/lib/book-edition").EditionMetadata & { editionKey: string };
export type EditionSummary = {
  editionKey: string;
  title: string;
  format: string | null;
  publisher: string | null;
  editionYear: string | null;
  isbn: string | null;
};
type LookupOptions = { fetchImpl?: typeof fetch; beforeRequest?: () => Promise<void> };
async function libraryJson(path: string, options: LookupOptions) {
  await options.beforeRequest?.();
  const response = await (options.fetchImpl ?? fetch)(`https://openlibrary.org${path}`, {
    headers: {
      Accept: "application/json",
      ...(process.env.OPEN_LIBRARY_CONTACT
        ? { "User-Agent": `StoryTurn (${process.env.OPEN_LIBRARY_CONTACT})` }
        : {}),
    },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(10000),
  } as RequestInit);
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error("Book lookup is temporarily unavailable. Please retry.");
  return response.json();
}
export async function mapEdition(
  edition: OpenLibraryEdition,
  options: LookupOptions,
  scannedIsbn?: string,
): Promise<EditionResult> {
  if (!/^\/books\/OL\d+M$/.test(edition.key) || typeof edition.title !== "string")
    throw new Error("Book metadata is incomplete. Try title search.");
  let authors = edition.authors ?? [];
  const workKey = edition.works?.find((w) => /^\/works\/OL\d+W$/.test(w.key))?.key ?? "";
  if (!authors.length && workKey) {
    const work = await libraryJson(`${workKey}.json`, options);
    authors =
      work?.authors?.map((entry: { author: { key: string } }) => entry.author) ?? [];
  }
  const names: string[] = [];
  for (const author of authors.slice(0, 4)) {
    if (!/^\/authors\/OL\d+A$/.test(author.key)) continue;
    const data = await libraryJson(`${author.key}.json`, options);
    if (typeof data?.name === "string") names.push(data.name);
  }
  const { normalizeIsbn } = await import("@/lib/isbn");
  const isbn =
    scannedIsbn ??
    [...(edition.isbn_13 ?? []), ...(edition.isbn_10 ?? [])]
      .map(normalizeIsbn)
      .find(Boolean) ??
    null;
  return {
    title: edition.title,
    authors: names,
    openLibraryKey: workKey,
    editionKey: edition.key,
    isbn,
    coverUrl: edition.covers?.find((id) => id > 0)
      ? `https://covers.openlibrary.org/b/id/${edition.covers.find((id) => id > 0)}-M.jpg`
      : null,
    year: null,
    format: edition.physical_format?.trim() || null,
    publisher: edition.publishers?.join(", ") || null,
    editionYear: edition.publish_date || null,
  };
}
export async function lookupIsbn(
  value: string,
  options: LookupOptions = {},
): Promise<EditionResult | null> {
  const { normalizeIsbn } = await import("@/lib/isbn");
  const isbn = normalizeIsbn(value);
  if (!isbn) throw new Error("Enter a valid ISBN-10 or ISBN-13.");
  const edition = await libraryJson(`/isbn/${isbn}.json`, options);
  return edition ? mapEdition(edition, options, isbn) : null;
}
export async function getWorkEditions(
  workKey: string,
  offset = 0,
  options: LookupOptions = {},
): Promise<{ entries: EditionSummary[]; hasMore: boolean }> {
  if (
    !/^\/works\/OL\d+W$/.test(workKey) ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 1000
  )
    throw new Error("Invalid edition request");
  const data = await libraryJson(
    `${workKey}/editions.json?limit=10&offset=${offset}`,
    options,
  );
  return {
    entries: (data?.entries ?? [])
      .map((e: OpenLibraryEdition) => ({
        editionKey: e.key,
        title: e.title,
        format: e.physical_format || null,
        publisher: e.publishers?.join(", ") || null,
        editionYear: e.publish_date || null,
        isbn: e.isbn_13?.[0] ?? e.isbn_10?.[0] ?? null,
      }))
      .filter((e: { editionKey: string }) => /^\/books\/OL\d+M$/.test(e.editionKey)),
    hasMore: offset + 10 < (data?.size ?? 0),
  };
}
export async function lookupEdition(key: string, options: LookupOptions = {}) {
  if (!/^\/books\/OL\d+M$/.test(key)) throw new Error("Choose a valid edition");
  const data = await libraryJson(`${key}.json`, options);
  return data ? mapEdition(data, options) : null;
}

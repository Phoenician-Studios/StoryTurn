import { sessionPageBounds } from "@/lib/domain/session-presentation";

export type LibraryBook = { id: string; title: string; coverUrl?: string | null };
export type LibraryPage = {
  items: LibraryBook[];
  page: number;
  pageCount: number;
  total: number;
};

export function librarySearchTerm(query: string) {
  return query.trim().slice(0, 120);
}

export function paginateLibrary(
  books: LibraryBook[],
  query: string,
  page: number,
): LibraryPage {
  const term = librarySearchTerm(query).toLocaleLowerCase("en-US");
  const matches = books
    .filter((book) => book.title.toLocaleLowerCase("en-US").includes(term))
    .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  const bounds = sessionPageBounds(matches.length, String(page));
  return {
    items: matches
      .slice(bounds.from, bounds.to + 1)
      .map(({ id, title, coverUrl }) => ({ id, title, coverUrl: coverUrl ?? null })),
    page: bounds.page,
    pageCount: bounds.pageCount,
    total: bounds.total,
  };
}

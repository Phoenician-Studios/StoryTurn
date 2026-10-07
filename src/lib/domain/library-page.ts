import type { EditionMetadata } from "@/lib/book-edition";
import { sessionPageBounds } from "@/lib/domain/session-presentation";

export type LibraryBook = {
  id: string;
  title: string;
  coverUrl?: string | null;
  isbn?: string | null;
} & EditionMetadata;
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
      .map(({ id, title, coverUrl, isbn, format, publisher, editionYear }) => ({
        id,
        title,
        coverUrl: coverUrl ?? null,
        ...(format !== undefined ? { format } : {}),
        ...(publisher !== undefined ? { publisher } : {}),
        ...(editionYear !== undefined ? { editionYear } : {}),
        ...(isbn !== undefined ? { isbn } : {}),
      })),
    page: bounds.page,
    pageCount: bounds.pageCount,
    total: bounds.total,
  };
}

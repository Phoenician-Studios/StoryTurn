/** Default number of library books to pre-pick for a reading night. */
export const SESSION_BOOK_PICK_COUNT = 3;

/**
 * Pick up to `count` distinct book ids at random (Fisher–Yates).
 * Returns fewer than `count` when the library is smaller.
 */
export function pickRandomBookIds(
  bookIds: string[],
  count: number = SESSION_BOOK_PICK_COUNT,
  random: () => number = Math.random,
): string[] {
  if (bookIds.length === 0 || count <= 0) return [];
  const n = Math.min(count, bookIds.length);
  const copy = [...bookIds];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy.slice(0, n);
}

export function sessionHasLibraryBooks(
  sessionBooks: Array<{ sessionId: string; bookId: string | null }>,
  sessionId: string,
): boolean {
  return sessionBooks.some(
    (b) => b.sessionId === sessionId && b.bookId !== null,
  );
}

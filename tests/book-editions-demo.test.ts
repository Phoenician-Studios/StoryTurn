import { beforeEach, expect, it } from "vitest";
import {
  resetDemoStore,
  startBookScan,
  finishBookScan,
  saveBookEdition,
  removeLibraryBooks,
  getDemoState,
} from "@/lib/demo/store";
const metadata = {
  title: "Book",
  authors: [],
  openLibraryKey: "/works/OL77W",
  editionKey: "/books/OL77M",
  isbn: null,
  coverUrl: null,
};
beforeEach(resetDemoStore);
it("keeps each tab's save and Undo session independent", () => {
  const first = startBookScan();
  const second = startBookScan();
  const saved = saveBookEdition(metadata, first);
  finishBookScan(second);
  expect(removeLibraryBooks([saved.book.id], first)[0].status).toBe("removed");
});
it("returns the same removal outcome for foreign and absent IDs", () => {
  const state = getDemoState();
  state.books.push({ ...state.books[0], id: "foreign-book", familyId: "other-family" });
  expect(
    removeLibraryBooks(["foreign-book", "absent-book"]).map((r) => r.status),
  ).toEqual(["removed", "removed"]);
  expect(state.books.some((b) => b.id === "foreign-book")).toBe(true);
});

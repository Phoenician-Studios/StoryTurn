import { expect, it } from "vitest";
import { selectRandomBooks } from "@/lib/domain/schedule-settings";

it("handles empty and small libraries without repeating or mutating books", () => {
  const books = ["a", "b", "a"];
  expect(selectRandomBooks([], 3)).toEqual([]);
  expect(selectRandomBooks(books, 5).sort()).toEqual(["a", "b"]);
  expect(books).toEqual(["a", "b", "a"]);
  expect(selectRandomBooks(books, 1)).toHaveLength(1);
});

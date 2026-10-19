import { describe, expect, it } from "vitest";
import {
  pickRandomBookIds,
  SESSION_BOOK_PICK_COUNT,
  sessionHasLibraryBooks,
} from "@/lib/domain/session-books";

describe("pickRandomBookIds", () => {
  it("picks three distinct books when the library is large enough", () => {
    const ids = ["a", "b", "c", "d", "e"];
    let i = 0;
    const sequence = [0.9, 0.1, 0.5, 0.2, 0.8];
    const picked = pickRandomBookIds(ids, 3, () => sequence[i++] ?? 0);
    expect(picked).toHaveLength(SESSION_BOOK_PICK_COUNT);
    expect(new Set(picked).size).toBe(3);
    expect(picked.every((id) => ids.includes(id))).toBe(true);
  });

  it("returns the whole library when fewer than three books exist", () => {
    expect(pickRandomBookIds(["a", "b"], 3, () => 0)).toEqual(["b", "a"]);
  });

  it("returns empty when the library is empty", () => {
    expect(pickRandomBookIds([], 3)).toEqual([]);
  });
});

describe("sessionHasLibraryBooks", () => {
  it("detects library-linked books on a session", () => {
    expect(
      sessionHasLibraryBooks(
        [
          { sessionId: "s1", bookId: "b1" },
          { sessionId: "s2", bookId: null },
        ],
        "s1",
      ),
    ).toBe(true);
    expect(
      sessionHasLibraryBooks([{ sessionId: "s2", bookId: null }], "s2"),
    ).toBe(false);
  });
});

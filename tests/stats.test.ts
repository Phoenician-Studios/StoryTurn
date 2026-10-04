import { describe, expect, it } from "vitest";
import { computeDashboardStats } from "@/lib/domain/stats";
import type {
  Book,
  ReadingSession,
  SessionAssignment,
  SessionBook,
} from "@/lib/types";

const sessions: ReadingSession[] = [
  {
    id: "s1",
    familyId: "f",
    scheduleId: null,
    scheduledFor: "2026-09-20T19:30:00",
    status: "completed",
    notes: null,
    icsUid: "1",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "s2",
    familyId: "f",
    scheduleId: null,
    scheduledFor: "2026-10-01T19:30:00",
    status: "completed",
    notes: null,
    icsUid: "2",
    createdAt: "",
    updatedAt: "",
  },
];

const assignments: SessionAssignment[] = [
  {
    id: "a1",
    sessionId: "s1",
    memberId: "alex",
    isOriginal: true,
    isCurrent: true,
    createdAt: "",
  },
  {
    id: "a2",
    sessionId: "s2",
    memberId: "jordan",
    isOriginal: true,
    isCurrent: true,
    createdAt: "",
  },
];

const sessionBooks: SessionBook[] = [
  {
    id: "b1",
    sessionId: "s1",
    bookId: "book1",
    titleFreeform: null,
    createdAt: "",
  },
  {
    id: "b2",
    sessionId: "s2",
    bookId: "book1",
    titleFreeform: null,
    createdAt: "",
  },
];

const books: Book[] = [
  {
    id: "book1",
    familyId: "f",
    title: "Goodnight Moon",
    authors: ["Margaret Wise Brown"],
    openLibraryKey: null,
    coverUrl: null,
    isbn: null,
    createdAt: "",
  },
];

describe("computeDashboardStats", () => {
  it("defaults to a single member filter", () => {
    const stats = computeDashboardStats({
      sessions,
      assignments,
      sessionBooks,
      books,
      filter: { type: "member", memberId: "alex" },
      nowIso: "2026-10-04T00:00:00.000Z",
    });
    expect(stats.sessionsCompleted).toBe(1);
    expect(stats.totalBooksLogged).toBe(1);
    expect(stats.allTime[0]?.title).toBe("Goodnight Moon");
  });

  it("supports whole-family filter", () => {
    const stats = computeDashboardStats({
      sessions,
      assignments,
      sessionBooks,
      books,
      filter: { type: "family" },
      nowIso: "2026-10-04T00:00:00.000Z",
    });
    expect(stats.sessionsCompleted).toBe(2);
    expect(stats.allTime[0]?.readCount).toBe(2);
  });
});

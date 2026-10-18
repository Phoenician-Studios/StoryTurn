import { beforeEach, describe, expect, it } from "vitest";
import {
  addBookFromSearch,
  addKid,
  getLibrary,
  addRandomBooksToUpcomingSessions,
  cancelSession,
  cascadeInsertReader,
  demoLogin,
  getDemoState,
  getFamilyAdmin,
  getDashboard,
  getHomeContext,
  getSessionDetail,
  getUpcomingBookCtaState,
  resetDemoStore,
  shuffleBooksForUpcomingSessions,
  shuffleSessionBooks,
  swapSessionReaders,
  updateMemberRelation,
  updateSession,
} from "@/lib/demo/store";
import { formatDateOnly } from "@/lib/domain/rotation";
import { SESSION_BOOK_PICK_COUNT } from "@/lib/domain/session-books";
import { sessionDateKey } from "@/lib/domain/sessions";

describe("demo store", () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it("signs in Alex and shows an upcoming session on home", () => {
    demoLogin("alex@example.com");
    const home = getHomeContext();
    expect(home.member?.displayName).toBe("Alex");
    expect(home.nextSession).not.toBeNull();
    expect(home.nextSession?.status).toBe("scheduled");
    expect(home.kids.every((k) => Boolean(k.birthday))).toBe(true);
  });

  it("adds a kid with a birthday instead of a static age", () => {
    demoLogin("alex@example.com");
    const kid = addKid("Sam", "2023-01-15");
    expect(kid.birthday).toBe("2023-01-15");
    const admin = getFamilyAdmin();
    expect(admin?.kids.some((k) => k.id === kid.id && k.birthday === "2023-01-15")).toBe(
      true,
    );
  });

  it("defaults dashboard filter to current member", () => {
    demoLogin("alex@example.com");
    const memberDash = getDashboard({
      type: "member",
      memberId: "mem_alex",
    });
    const familyDash = getDashboard({ type: "family" });
    expect(memberDash?.stats.sessionsCompleted).toBeGreaterThan(0);
    expect(familyDash?.stats.sessionsCompleted).toBeGreaterThan(
      memberDash!.stats.sessionsCompleted,
    );
  });

  it("cancels a future session", async () => {
    demoLogin("alex@example.com");
    const home = getHomeContext();
    const sessionId = home.nextSession!.id;
    await cancelSession(sessionId);
    const detail = getSessionDetail(sessionId);
    expect(detail?.session.status).toBe("cancelled");
  });

  it("corrects a past session while preserving the original reader", async () => {
    demoLogin("alex@example.com");
    const home = getHomeContext();
    const corrected = home.family
      ? getSessionDetail(
          // find a completed session with a correction from seed, or correct one
          "unused",
        )
      : null;
    void corrected;

    // Find any completed session assigned currently to someone
    const { getDemoState } = await import("@/lib/demo/store");
    const past = getDemoState().sessions.find((s) => s.status === "completed");
    expect(past).toBeTruthy();
    await updateSession({
      sessionId: past!.id,
      memberIds: ["mem_jordan"],
      bookIds: ["book_moon"],
      freeformTitles: [],
      notes: "Updated after the fact",
      status: "completed",
      reason: "Logging the correct reader",
    });
    const detail = getSessionDetail(past!.id);
    expect(detail?.corrections.length).toBeGreaterThan(0);
    expect(detail?.assignments.some((a) => a.isOriginal)).toBe(true);
    expect(detail?.assignments.find((a) => a.isCurrent)?.memberId).toBe(
      "mem_jordan",
    );
  });

  it("seeds relation-to-children on members", () => {
    demoLogin("alex@example.com");
    const admin = getFamilyAdmin();
    expect(admin?.readers.find((r) => r.id === "mem_alex")?.relationToChildren).toBe(
      "parent",
    );
    expect(admin?.readers.find((r) => r.id === "mem_nana")?.relationToChildren).toBe(
      "grandparent",
    );
  });

  it("lets owners update a member relation", () => {
    demoLogin("alex@example.com");
    updateMemberRelation("mem_nana", "caregiver");
    expect(
      getFamilyAdmin()?.readers.find((r) => r.id === "mem_nana")
        ?.relationToChildren,
    ).toBe("caregiver");
  });

  it("rejects relation edits from non-owners", () => {
    demoLogin("jordan@example.com");
    expect(() => updateMemberRelation("mem_nana", "parent")).toThrow(
      /family admins/,
    );
  });

  it("cascades a grandparent fill-in and shifts later nights", async () => {
    demoLogin("alex@example.com");
    const today = formatDateOnly(new Date());
    const upcoming = getDemoState()
      .sessions.filter(
        (s) =>
          s.status === "scheduled" && sessionDateKey(s.scheduledFor) >= today,
      )
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
    expect(upcoming.length).toBeGreaterThanOrEqual(2);

    const night0 = upcoming[0]!;
    const night1 = upcoming[1]!;
    const readerOf = (sessionId: string) =>
      getDemoState().assignments.find(
        (a) => a.sessionId === sessionId && a.isCurrent,
      )!.memberId;

    const original0 = readerOf(night0.id);
    const original1 = readerOf(night1.id);

    const result = await cascadeInsertReader({
      fromSessionId: night0.id,
      fillInMemberId: "mem_nana",
    });

    expect(readerOf(night0.id)).toBe("mem_nana");
    expect(readerOf(night1.id)).toBe(original0);
    expect(readerOf(result.extraSessionId)).toBeDefined();
    // Second night's original reader should appear on a later night
    const afterCascade = getDemoState()
      .sessions.filter(
        (s) =>
          s.status === "scheduled" && sessionDateKey(s.scheduledFor) >= today,
      )
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
    const readers = afterCascade.map((s) => readerOf(s.id));
    expect(readers[0]).toBe("mem_nana");
    expect(readers[1]).toBe(original0);
    expect(readers[2]).toBe(original1);
  });

  it("swaps two future nights without shifting others", async () => {
    demoLogin("alex@example.com");
    const today = formatDateOnly(new Date());
    const upcoming = getDemoState()
      .sessions.filter(
        (s) =>
          s.status === "scheduled" && sessionDateKey(s.scheduledFor) >= today,
      )
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
    const a = upcoming[0]!;
    const b = upcoming[1]!;
    const c = upcoming[2]!;
    const readerOf = (sessionId: string) =>
      getDemoState().assignments.find(
        (asg) => asg.sessionId === sessionId && asg.isCurrent,
      )!.memberId;
    const before = [readerOf(a.id), readerOf(b.id), readerOf(c.id)];

    await swapSessionReaders({ sessionAId: a.id, sessionBId: b.id });

    expect(readerOf(a.id)).toBe(before[1]);
    expect(readerOf(b.id)).toBe(before[0]);
    expect(readerOf(c.id)).toBe(before[2]);
  });

  it("blocks cascade from non-owners", async () => {
    demoLogin("jordan@example.com");
    const today = formatDateOnly(new Date());
    const night = getDemoState().sessions.find(
      (s) =>
        s.status === "scheduled" && sessionDateKey(s.scheduledFor) >= today,
    )!;
    await expect(
      cascadeInsertReader({
        fromSessionId: night.id,
        fillInMemberId: "mem_nana",
      }),
    ).rejects.toThrow(/family admins/);
  });

  it("seeds upcoming nights with three library books", () => {
    demoLogin("alex@example.com");
    const today = formatDateOnly(new Date());
    const upcoming = getDemoState().sessions.filter(
      (s) =>
        s.status === "scheduled" && sessionDateKey(s.scheduledFor) >= today,
    );
    expect(upcoming.length).toBeGreaterThan(0);
    for (const session of upcoming) {
      const books = getDemoState().sessionBooks.filter(
        (b) => b.sessionId === session.id && b.bookId,
      );
      expect(books.length).toBe(SESSION_BOOK_PICK_COUNT);
    }
    expect(getUpcomingBookCtaState().withBooksCount).toBe(upcoming.length);
    expect(getUpcomingBookCtaState().withoutBooksCount).toBe(0);
  });

  it("shuffles books for one session and for all upcoming nights", () => {
    demoLogin("alex@example.com");
    const home = getHomeContext();
    const sessionId = home.nextSession!.id;
    const afterOne = shuffleSessionBooks(sessionId).slice().sort();
    expect(afterOne).toHaveLength(SESSION_BOOK_PICK_COUNT);

    // Clear one upcoming night, then fill via add-random CTA
    const today = formatDateOnly(new Date());
    const target = getDemoState().sessions.find(
      (s) =>
        s.status === "scheduled" && sessionDateKey(s.scheduledFor) >= today,
    )!;
    getDemoState().sessionBooks = getDemoState().sessionBooks.filter(
      (b) => b.sessionId !== target.id,
    );
    expect(addRandomBooksToUpcomingSessions()).toBeGreaterThan(0);
    expect(
      getDemoState().sessionBooks.filter(
        (b) => b.sessionId === target.id && b.bookId,
      ),
    ).toHaveLength(SESSION_BOOK_PICK_COUNT);

    const shuffledCount = shuffleBooksForUpcomingSessions();
    expect(shuffledCount).toBeGreaterThan(0);
  });

  it("rejects shuffling books on completed nights", () => {
    demoLogin("alex@example.com");
    const completed = getDemoState().sessions.find(
      (s) => s.status === "completed",
    );
    expect(completed).toBeTruthy();
    expect(() => shuffleSessionBooks(completed!.id)).toThrow(/scheduled nights/);
  });

  describe("adding books with duplicate detection", () => {
    const goodnightMoonNoCover = {
      title: "Goodnight moon",
      authors: ["Brown, Margaret Wise"],
      openLibraryKey: null,
      coverUrl: null,
      isbn: "9780694003617",
    };

    it("keeps the earlier book when the barcode matches in another format", () => {
      demoLogin("alex@example.com");
      const before = getLibrary().length;
      const result = addBookFromSearch({
        title: "Goodnight Moon (Board Book)",
        authors: [],
        openLibraryKey: null,
        coverUrl: null,
        isbn: "0-06-077585-8",
      });
      expect(result).toMatchObject({
        status: "already_in_library",
        existing: { id: "book_moon" },
      });
      expect(getLibrary()).toHaveLength(before);
    });

    it("asks before adding a same-title book with a different barcode", () => {
      demoLogin("alex@example.com");
      const before = getLibrary().length;
      const result = addBookFromSearch(goodnightMoonNoCover);
      expect(result.status).toBe("possible_duplicate");
      if (result.status !== "possible_duplicate") return;
      expect(result.candidates).toEqual([
        expect.objectContaining({
          existing: expect.objectContaining({ id: "book_moon" }),
          recommended: "existing",
        }),
      ]);
      expect(getLibrary()).toHaveLength(before);
    });

    it("adds a second copy when the user keeps both", () => {
      demoLogin("alex@example.com");
      const before = getLibrary().length;
      const result = addBookFromSearch(goodnightMoonNoCover, { action: "keep_both" });
      expect(result.status).toBe("added");
      expect(getLibrary()).toHaveLength(before + 1);
    });

    it("replaces the existing book in place so session links survive", () => {
      demoLogin("alex@example.com");
      const linked = getDemoState().sessionBooks.filter((b) => b.bookId === "book_moon");
      const before = getLibrary().length;
      const result = addBookFromSearch(
        { ...goodnightMoonNoCover, coverUrl: "https://example.com/new.jpg" },
        { action: "replace", existingBookId: "book_moon" },
      );
      expect(result).toMatchObject({
        status: "replaced",
        book: {
          id: "book_moon",
          isbn: "9780694003617",
          coverUrl: "https://example.com/new.jpg",
        },
      });
      expect(getLibrary()).toHaveLength(before);
      expect(getDemoState().sessionBooks.filter((b) => b.bookId === "book_moon")).toEqual(
        linked,
      );
    });

    it("rejects replacing a book that is not a duplicate match", () => {
      demoLogin("alex@example.com");
      expect(() =>
        addBookFromSearch(goodnightMoonNoCover, {
          action: "replace",
          existingBookId: "book_hungry",
        }),
      ).toThrow(/no longer a match/);
    });

    it("stores scanned ISBN-10 as ISBN-13", () => {
      demoLogin("alex@example.com");
      const result = addBookFromSearch({
        title: "The Catcher in the Rye",
        authors: ["J. D. Salinger"],
        openLibraryKey: null,
        coverUrl: null,
        isbn: "0316769487",
      });
      expect(result).toMatchObject({ status: "added", book: { isbn: "9780316769488" } });
    });
  });
});

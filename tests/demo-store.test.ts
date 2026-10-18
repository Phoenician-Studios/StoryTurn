import { beforeEach, describe, expect, it } from "vitest";
import {
  addKid,
  cancelSession,
  cascadeInsertReader,
  demoLogin,
  getDemoState,
  getFamilyAdmin,
  getDashboard,
  getHomeContext,
  getSessionDetail,
  resetDemoStore,
  swapSessionReaders,
  updateMemberRelation,
  updateSession,
} from "@/lib/demo/store";
import { formatDateOnly } from "@/lib/domain/rotation";
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
});

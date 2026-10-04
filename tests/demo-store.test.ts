import { beforeEach, describe, expect, it } from "vitest";
import {
  cancelSession,
  demoLogin,
  getDashboard,
  getHomeContext,
  getSessionDetail,
  resetDemoStore,
  updateSession,
} from "@/lib/demo/store";

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
});

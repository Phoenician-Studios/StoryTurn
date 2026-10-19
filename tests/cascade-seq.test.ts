import { beforeEach, describe, expect, it } from "vitest";
import {
  cascadeInsertReader,
  demoLogin,
  getDemoState,
  resetDemoStore,
} from "@/lib/demo/store";
import { formatDateOnly } from "@/lib/domain/rotation";
import { sessionDateKey } from "@/lib/domain/sessions";

describe("cascade sequence integrity", () => {
  beforeEach(() => resetDemoStore());

  it("keeps alternating parents after one Nana cascade", async () => {
    demoLogin("alex@example.com");
    const today = formatDateOnly(new Date());
    const upcoming = () =>
      getDemoState()
        .sessions.filter(
          (s) =>
            s.status === "scheduled" &&
            sessionDateKey(s.scheduledFor) >= today,
        )
        .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
    const readerOf = (sessionId: string) =>
      getDemoState().assignments.find(
        (a) => a.sessionId === sessionId && a.isCurrent,
      )!.memberId;

    const before = upcoming();
    await cascadeInsertReader({
      fromSessionId: before[0]!.id,
      fillInMemberId: "mem_nana",
    });
    const after = upcoming();
    console.log(
      after.map((s) => `${sessionDateKey(s.scheduledFor)}:${readerOf(s.id)}`),
    );
    expect(readerOf(after[0]!.id)).toBe("mem_nana");
    for (let i = 2; i < after.length; i++) {
      expect(readerOf(after[i]!.id)).not.toBe(readerOf(after[i - 1]!.id));
    }
  });
});

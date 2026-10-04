import { describe, expect, it } from "vitest";
import {
  applyReassignment,
  buildCorrectionRecord,
  originalReaderLabels,
  wasCorrected,
} from "@/lib/domain/corrections";
import type { SessionAssignment } from "@/lib/types";

describe("applyReassignment", () => {
  it("keeps original assignment rows when correcting a past night", () => {
    let assignments: SessionAssignment[] = [];
    assignments = applyReassignment({
      existing: assignments,
      sessionId: "s1",
      newMemberIds: ["mem_alex"],
      nowIso: "2026-10-01T12:00:00.000Z",
    });
    assignments = applyReassignment({
      existing: assignments,
      sessionId: "s1",
      newMemberIds: ["mem_nana"],
      nowIso: "2026-10-02T12:00:00.000Z",
    });

    const forSession = assignments.filter((a) => a.sessionId === "s1");
    expect(forSession.filter((a) => a.isOriginal)).toHaveLength(1);
    expect(forSession.find((a) => a.isOriginal)?.memberId).toBe("mem_alex");
    expect(forSession.find((a) => a.isCurrent)?.memberId).toBe("mem_nana");
    expect(
      wasCorrected({
        assignments,
        corrections: [],
        sessionId: "s1",
      }),
    ).toBe(true);
    expect(
      originalReaderLabels({
        assignments,
        memberNames: { mem_alex: "Alex", mem_nana: "Nana" },
        sessionId: "s1",
      }),
    ).toEqual(["Alex"]);
  });
});

describe("buildCorrectionRecord", () => {
  it("requires a reason and a change", () => {
    expect(() =>
      buildCorrectionRecord({
        sessionId: "s1",
        correctedByMemberId: "mem_a",
        reason: " ",
        before: {
          status: "completed",
          currentMemberIds: ["a"],
          bookTitles: [],
          notes: null,
        },
        after: {
          status: "completed",
          currentMemberIds: ["b"],
          bookTitles: [],
          notes: null,
        },
      }),
    ).toThrow(/reason/i);

    expect(() =>
      buildCorrectionRecord({
        sessionId: "s1",
        correctedByMemberId: "mem_a",
        reason: "noop",
        before: {
          status: "completed",
          currentMemberIds: ["a"],
          bookTitles: [],
          notes: null,
        },
        after: {
          status: "completed",
          currentMemberIds: ["a"],
          bookTitles: [],
          notes: null,
        },
      }),
    ).toThrow(/change/i);
  });
});

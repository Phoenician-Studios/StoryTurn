import { describe, expect, it } from "vitest";
import {
  generateSessionsFromSchedule,
  nextSessionForMember,
  sessionDateKey,
} from "@/lib/domain/sessions";
import type { ReadingSession, Schedule, SessionAssignment } from "@/lib/types";

const schedule: Schedule = {
  id: "sch1",
  familyId: "fam1",
  mode: "together",
  readerRotationMemberIds: ["mem_a", "mem_b"],
  startDate: "2026-10-01",
  timeLocal: "19:30",
  timezone: "America/Los_Angeles",
  bookTiming: "after",
  active: true,
  createdAt: "2026-10-01T00:00:00.000Z",
};

describe("generateSessionsFromSchedule", () => {
  it("fills missing nights through a date", () => {
    const drafts = generateSessionsFromSchedule({
      schedule,
      existingSessionDates: new Set(["2026-10-01"]),
      throughDate: "2026-10-03",
    });
    expect(drafts).toHaveLength(2);
    expect(sessionDateKey(drafts[0]!.scheduledFor)).toBe("2026-10-02");
    expect(drafts[0]!.memberId).toBe("mem_b");
    expect(drafts[1]!.memberId).toBe("mem_a");
  });

  it("skips inactive schedules", () => {
    const drafts = generateSessionsFromSchedule({
      schedule: { ...schedule, active: false },
      existingSessionDates: new Set(),
      throughDate: "2026-10-03",
    });
    expect(drafts).toEqual([]);
  });
});

describe("nextSessionForMember", () => {
  it("returns the soonest scheduled night for the member", () => {
    const sessions: ReadingSession[] = [
      {
        id: "s1",
        familyId: "fam1",
        scheduleId: "sch1",
        scheduledFor: "2026-10-05T19:30:00",
        status: "scheduled",
        notes: null,
        icsUid: "u1",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "s2",
        familyId: "fam1",
        scheduleId: "sch1",
        scheduledFor: "2026-10-04T19:30:00",
        status: "scheduled",
        notes: null,
        icsUid: "u2",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const assignments: SessionAssignment[] = [
      {
        id: "a1",
        sessionId: "s1",
        memberId: "mem_a",
        isOriginal: true,
        isCurrent: true,
        createdAt: "",
      },
      {
        id: "a2",
        sessionId: "s2",
        memberId: "mem_a",
        isOriginal: true,
        isCurrent: true,
        createdAt: "",
      },
    ];
    const next = nextSessionForMember({
      sessions,
      assignments,
      memberId: "mem_a",
      nowIso: "2026-10-03T12:00:00.000Z",
    });
    expect(next?.id).toBe("s2");
  });
});

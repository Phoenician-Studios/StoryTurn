import { describe, expect, it } from "vitest";
import {
  buildCascadePlan,
  nextOpenNightDate,
  orderedFutureScheduledNights,
  planSwapNights,
} from "@/lib/domain/cascade";
import type { ReadingSession, SessionAssignment } from "@/lib/types";

describe("buildCascadePlan", () => {
  it("shifts wife and husband forward when a grandparent covers tonight", () => {
    // Tonight wife, tomorrow husband, next wife → Nana tonight, wife tomorrow, husband next, wife overflow
    const plan = buildCascadePlan({
      nights: [
        { sessionId: "s0", memberId: "wife", date: "2026-10-18" },
        { sessionId: "s1", memberId: "husband", date: "2026-10-19" },
        { sessionId: "s2", memberId: "wife", date: "2026-10-20" },
      ],
      fillInMemberId: "nana",
      allFamilySessionDates: ["2026-10-18", "2026-10-19", "2026-10-20"],
    });

    expect(plan.reassignments).toEqual([
      { sessionId: "s0", memberId: "nana" },
      { sessionId: "s1", memberId: "wife" },
      { sessionId: "s2", memberId: "husband" },
    ]);
    expect(plan.extraNightMemberId).toBe("wife");
    expect(plan.extraNightDate).toBe("2026-10-21");
  });

  it("rejects an empty night list", () => {
    expect(() =>
      buildCascadePlan({
        nights: [],
        fillInMemberId: "nana",
        allFamilySessionDates: [],
      }),
    ).toThrow(/at least one/);
  });
});

describe("nextOpenNightDate", () => {
  it("skips occupied dates", () => {
    expect(
      nextOpenNightDate({
        sessionDates: ["2026-10-20", "2026-10-21"],
        afterDate: "2026-10-20",
      }),
    ).toBe("2026-10-22");
  });
});

describe("planSwapNights", () => {
  it("exchanges two readers", () => {
    expect(
      planSwapNights({
        sessionAId: "a",
        sessionBId: "b",
        readerAId: "wife",
        readerBId: "husband",
      }),
    ).toEqual([
      { sessionId: "a", memberId: "husband" },
      { sessionId: "b", memberId: "wife" },
    ]);
  });

  it("rejects the same night twice", () => {
    expect(() =>
      planSwapNights({
        sessionAId: "a",
        sessionBId: "a",
        readerAId: "wife",
        readerBId: "husband",
      }),
    ).toThrow(/different nights/);
  });
});

describe("orderedFutureScheduledNights", () => {
  const sessions: ReadingSession[] = [
    {
      id: "past",
      familyId: "f1",
      scheduleId: "sch",
      scheduledFor: "2026-10-17T19:30:00",
      status: "scheduled",
      notes: null,
      icsUid: "u1",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "tonight",
      familyId: "f1",
      scheduleId: "sch",
      scheduledFor: "2026-10-18T19:30:00",
      status: "scheduled",
      notes: null,
      icsUid: "u2",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "tomorrow",
      familyId: "f1",
      scheduleId: "sch",
      scheduledFor: "2026-10-19T19:30:00",
      status: "scheduled",
      notes: null,
      icsUid: "u3",
      createdAt: "",
      updatedAt: "",
    },
  ];
  const assignments: SessionAssignment[] = [
    {
      id: "1",
      sessionId: "tonight",
      memberId: "wife",
      isOriginal: true,
      isCurrent: true,
      createdAt: "",
    },
    {
      id: "2",
      sessionId: "tomorrow",
      memberId: "husband",
      isOriginal: true,
      isCurrent: true,
      createdAt: "",
    },
    {
      id: "3",
      sessionId: "past",
      memberId: "husband",
      isOriginal: true,
      isCurrent: true,
      createdAt: "",
    },
  ];

  it("returns nights from the anchor forward", () => {
    const nights = orderedFutureScheduledNights({
      sessions,
      assignments,
      fromSessionId: "tonight",
      nowDay: "2026-10-18",
    });
    expect(nights.map((n) => n.memberId)).toEqual(["wife", "husband"]);
  });

  it("rejects cascading from the past", () => {
    expect(() =>
      orderedFutureScheduledNights({
        sessions,
        assignments,
        fromSessionId: "past",
        nowDay: "2026-10-18",
      }),
    ).toThrow(/past/);
  });
});

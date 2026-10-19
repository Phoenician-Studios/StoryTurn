import { addDays, formatDateOnly } from "@/lib/domain/rotation";
import { sessionDateKey } from "@/lib/domain/sessions";
import type { ReadingSession, SessionAssignment } from "@/lib/types";

export interface CascadeNight {
  sessionId: string;
  /** Current reader for that night (single-reader nights in v1). */
  memberId: string;
  /** YYYY-MM-DD */
  date: string;
}

export interface CascadePlan {
  /** Session id → new current reader member id */
  reassignments: Array<{ sessionId: string; memberId: string }>;
  /** YYYY-MM-DD for the night that must exist for the last displaced reader */
  extraNightDate: string;
  /** Reader who needs the extra night */
  extraNightMemberId: string;
}

/**
 * Insert a fill-in reader on the first night and shift everyone forward one day.
 *
 * Example: nights [wife, husband, wife] + fill-in grandparent →
 * [grandparent, wife, husband] and the last displaced wife needs one extra night.
 */
export function buildCascadePlan(params: {
  nights: CascadeNight[];
  fillInMemberId: string;
  allFamilySessionDates: string[];
}): CascadePlan {
  const { nights, fillInMemberId } = params;
  if (nights.length === 0) {
    throw new Error("Cascade needs at least one future night");
  }
  if (!fillInMemberId.trim()) {
    throw new Error("Fill-in reader is required");
  }

  const readers = nights.map((n) => n.memberId);
  const reassignments: CascadePlan["reassignments"] = [
    { sessionId: nights[0]!.sessionId, memberId: fillInMemberId },
  ];

  for (let i = 1; i < nights.length; i += 1) {
    reassignments.push({
      sessionId: nights[i]!.sessionId,
      memberId: readers[i - 1]!,
    });
  }

  const lastDate = nights[nights.length - 1]!.date;
  const extraNightDate = nextOpenNightDate({
    sessionDates: params.allFamilySessionDates,
    afterDate: lastDate,
  });

  return {
    reassignments,
    extraNightDate,
    extraNightMemberId: readers[readers.length - 1]!,
  };
}

/**
 * After cascade reassignments on existing nights, compute the next calendar
 * date that should hold the displaced last reader.
 */
export function nextOpenNightDate(params: {
  sessionDates: string[];
  afterDate: string;
}): string {
  const occupied = new Set(params.sessionDates);
  let cursor = addDays(params.afterDate, 1);
  for (let i = 0; i < 366; i += 1) {
    if (!occupied.has(cursor)) return cursor;
    cursor = addDays(cursor, 1);
  }
  throw new Error("Could not find an open night within a year");
}

export function planSwapNights(params: {
  sessionAId: string;
  sessionBId: string;
  readerAId: string;
  readerBId: string;
}): Array<{ sessionId: string; memberId: string }> {
  if (params.sessionAId === params.sessionBId) {
    throw new Error("Pick two different nights to swap");
  }
  if (params.readerAId === params.readerBId) {
    throw new Error("Those nights already have the same reader");
  }
  return [
    { sessionId: params.sessionAId, memberId: params.readerBId },
    { sessionId: params.sessionBId, memberId: params.readerAId },
  ];
}

export function orderedFutureScheduledNights(params: {
  sessions: ReadingSession[];
  assignments: SessionAssignment[];
  fromSessionId: string;
  nowDay?: string;
}): CascadeNight[] {
  const nowDay = params.nowDay ?? formatDateOnly(new Date());
  const anchor = params.sessions.find((s) => s.id === params.fromSessionId);
  if (!anchor) throw new Error("Anchor session not found");
  if (anchor.status !== "scheduled") {
    throw new Error("Cascade only works on scheduled nights");
  }
  const anchorDate = sessionDateKey(anchor.scheduledFor);
  if (anchorDate < nowDay) {
    throw new Error("Cannot cascade from a past night");
  }

  const currentBySession = new Map<string, string>();
  for (const a of params.assignments) {
    if (!a.isCurrent) continue;
    if (!currentBySession.has(a.sessionId)) {
      currentBySession.set(a.sessionId, a.memberId);
    }
  }

  const nights = params.sessions
    .filter(
      (s) =>
        s.status === "scheduled" &&
        s.familyId === anchor.familyId &&
        sessionDateKey(s.scheduledFor) >= anchorDate,
    )
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
    .map((s) => {
      const memberId = currentBySession.get(s.id);
      if (!memberId) {
        throw new Error(`Session ${s.id} has no current reader`);
      }
      return {
        sessionId: s.id,
        memberId,
        date: sessionDateKey(s.scheduledFor),
      };
    });

  if (nights.length === 0 || nights[0]!.sessionId !== params.fromSessionId) {
    throw new Error("Anchor night must be the first night in the cascade");
  }

  return nights;
}

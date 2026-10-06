import type { SessionAssignment, SessionCorrection } from "@/lib/types";

export interface CorrectionSnapshot {
  status: string;
  currentMemberIds: string[];
  bookTitles: string[];
  notes: string | null;
}

export function buildCorrectionRecord(params: {
  sessionId: string;
  correctedByMemberId: string;
  reason: string;
  before: CorrectionSnapshot;
  after: CorrectionSnapshot;
  nowIso?: string;
}): Omit<SessionCorrection, "id"> {
  const reason = params.reason.trim();
  if (!reason) {
    throw new Error("Correction reason is required");
  }
  if (JSON.stringify(params.before) === JSON.stringify(params.after)) {
    throw new Error("Correction must change something");
  }
  return {
    sessionId: params.sessionId,
    correctedByMemberId: params.correctedByMemberId,
    reason,
    before: { ...params.before },
    after: { ...params.after },
    createdAt: params.nowIso ?? new Date().toISOString(),
  };
}

/**
 * When reassigning a past session, keep original rows (`isOriginal`) and
 * flip `isCurrent` so history remains visible.
 */
export function applyReassignment(params: {
  existing: SessionAssignment[];
  sessionId: string;
  newMemberIds: string[];
  nowIso?: string;
}): SessionAssignment[] {
  const now = params.nowIso ?? new Date().toISOString();
  const forSession = params.existing.filter((a) => a.sessionId === params.sessionId);
  const others = params.existing.filter((a) => a.sessionId !== params.sessionId);

  const currentIds = new Set(
    forSession.filter((row) => row.isCurrent).map((row) => row.memberId),
  );
  const requestedIds = new Set(params.newMemberIds);
  if (
    currentIds.size === requestedIds.size &&
    [...currentIds].every((id) => requestedIds.has(id))
  ) {
    return params.existing;
  }

  const cleared = forSession.map((a) => ({ ...a, isCurrent: false }));

  const next: SessionAssignment[] = [...cleared];
  for (const memberId of params.newMemberIds) {
    const existingOriginal = cleared.find((a) => a.memberId === memberId && a.isOriginal);
    if (existingOriginal) {
      next.splice(
        next.findIndex((a) => a.id === existingOriginal.id),
        1,
        { ...existingOriginal, isCurrent: true },
      );
      continue;
    }
    next.push({
      id: `asg_${params.sessionId}_${memberId}_${now}`,
      sessionId: params.sessionId,
      memberId,
      isOriginal: forSession.length === 0,
      isCurrent: true,
      createdAt: now,
    });
  }

  // First assignment batch is always original
  if (forSession.length === 0) {
    return [...others, ...next.map((a) => ({ ...a, isOriginal: true, isCurrent: true }))];
  }

  return [...others, ...next];
}

export function originalReaderLabels(params: {
  assignments: SessionAssignment[];
  memberNames: Record<string, string>;
  sessionId: string;
}): string[] {
  return params.assignments
    .filter((a) => a.sessionId === params.sessionId && a.isOriginal)
    .map((a) => params.memberNames[a.memberId] ?? "Unknown");
}

export function currentReaderLabels(params: {
  assignments: SessionAssignment[];
  memberNames: Record<string, string>;
  sessionId: string;
}): string[] {
  return params.assignments
    .filter((a) => a.sessionId === params.sessionId && a.isCurrent)
    .map((a) => params.memberNames[a.memberId] ?? "Unknown");
}

export function wasCorrected(params: {
  assignments: SessionAssignment[];
  corrections: SessionCorrection[];
  sessionId: string;
}): boolean {
  if (params.corrections.some((c) => c.sessionId === params.sessionId)) {
    return true;
  }
  const forSession = params.assignments.filter((a) => a.sessionId === params.sessionId);
  const originalIds = forSession
    .filter((a) => a.isOriginal)
    .map((a) => a.memberId)
    .sort()
    .join(",");
  const currentIds = forSession
    .filter((a) => a.isCurrent)
    .map((a) => a.memberId)
    .sort()
    .join(",");
  return originalIds !== currentIds;
}

import { applyReassignment, buildCorrectionRecord } from "@/lib/domain/corrections";
import { generateInviteCode, isInviteUsable, normalizeInviteCode } from "@/lib/domain/invites";
import {
  assertTransition,
  generateSessionsFromSchedule,
  isPastSession,
  nextSessionForMember,
  sessionDateKey,
} from "@/lib/domain/sessions";
import { computeDashboardStats } from "@/lib/domain/stats";
import { addDays, formatDateOnly } from "@/lib/domain/rotation";
import { createSeedState } from "@/lib/demo/seed";
import { buildReadingInviteIcs, readingInviteSubject } from "@/lib/ics";
import { sendEmail } from "@/lib/plunk";
import type {
  AppState,
  Book,
  DashboardFilter,
  FamilyMember,
  Kid,
  ReadingSession,
  UserAccount,
} from "@/lib/types";

const globalForDemo = globalThis as unknown as {
  __storyTurnState?: AppState;
  __storyTurnSessionUserId?: string | null;
};

function state(): AppState {
  if (!globalForDemo.__storyTurnState) {
    globalForDemo.__storyTurnState = createSeedState();
  }
  return globalForDemo.__storyTurnState;
}

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function resetDemoStore(): void {
  globalForDemo.__storyTurnState = createSeedState();
  globalForDemo.__storyTurnSessionUserId = "user_alex";
}

export function getDemoState(): AppState {
  return state();
}

export function getDemoSessionUserId(): string | null {
  if (globalForDemo.__storyTurnSessionUserId === undefined) {
    globalForDemo.__storyTurnSessionUserId = "user_alex";
  }
  return globalForDemo.__storyTurnSessionUserId;
}

export function setDemoSessionUserId(userId: string | null): void {
  globalForDemo.__storyTurnSessionUserId = userId;
}

export function getCurrentUser(): UserAccount | null {
  const userId = getDemoSessionUserId();
  if (!userId) return null;
  return state().users.find((u) => u.id === userId) ?? null;
}

export function getCurrentMember(): FamilyMember | null {
  const user = getCurrentUser();
  if (!user) return null;
  return state().members.find((m) => m.userId === user.id) ?? null;
}

export function demoLogin(email: string): UserAccount {
  const normalized = email.trim().toLowerCase();
  const existing = state().users.find((u) => u.email === normalized);
  if (existing) {
    setDemoSessionUserId(existing.id);
    return existing;
  }
  const user: UserAccount = {
    id: id("user"),
    email: normalized,
    displayName: normalized.split("@")[0] || "Reader",
    passwordHash: "demo",
    createdAt: new Date().toISOString(),
  };
  state().users.push(user);
  setDemoSessionUserId(user.id);
  return user;
}

export function demoLogout(): void {
  setDemoSessionUserId(null);
}

export function createFamily(name: string): void {
  const user = getCurrentUser();
  if (!user) throw new Error("Not signed in");
  if (getCurrentMember()) throw new Error("Already in a family");

  const now = new Date().toISOString();
  const familyId = id("fam");
  state().families.push({
    id: familyId,
    name: name.trim(),
    createdByUserId: user.id,
    createdAt: now,
  });
  state().members.push({
    id: id("mem"),
    familyId,
    userId: user.id,
    displayName: user.displayName,
    email: user.email,
    role: "owner",
    createdAt: now,
  });
  state().invites.push({
    id: id("inv"),
    familyId,
    code: generateInviteCode(),
    createdByMemberId: state().members.at(-1)!.id,
    expiresAt: null,
    maxUses: 25,
    uses: 0,
    createdAt: now,
  });
}

export function joinFamily(codeRaw: string): void {
  const user = getCurrentUser();
  if (!user) throw new Error("Not signed in");
  if (getCurrentMember()) throw new Error("Already in a family");

  const code = normalizeInviteCode(codeRaw);
  const invite = state().invites.find(
    (i) => normalizeInviteCode(i.code) === code,
  );
  if (!invite) throw new Error("Invalid invite code");

  const usable = isInviteUsable({
    code,
    expectedCode: invite.code,
    uses: invite.uses,
    maxUses: invite.maxUses,
    expiresAt: invite.expiresAt,
  });
  if (!usable.ok) throw new Error(usable.reason);

  invite.uses += 1;
  state().members.push({
    id: id("mem"),
    familyId: invite.familyId,
    userId: user.id,
    displayName: user.displayName,
    email: user.email,
    role: "reader",
    createdAt: new Date().toISOString(),
  });
}

export function addKid(name: string, age: number): Kid {
  const member = getCurrentMember();
  if (!member) throw new Error("Join a family first");
  const kid: Kid = {
    id: id("kid"),
    familyId: member.familyId,
    name: name.trim(),
    age,
    createdAt: new Date().toISOString(),
  };
  state().kids.push(kid);
  return kid;
}

export function addBookFromSearch(input: {
  title: string;
  authors: string[];
  openLibraryKey: string | null;
  coverUrl: string | null;
  isbn: string | null;
}): Book {
  const member = getCurrentMember();
  if (!member) throw new Error("Join a family first");
  const book: Book = {
    id: id("book"),
    familyId: member.familyId,
    title: input.title,
    authors: input.authors,
    openLibraryKey: input.openLibraryKey,
    coverUrl: input.coverUrl,
    isbn: input.isbn,
    createdAt: new Date().toISOString(),
  };
  state().books.push(book);
  return book;
}

export function ensureUpcomingSessions(daysAhead = 14): number {
  const member = getCurrentMember();
  if (!member) return 0;
  const today = formatDateOnly(new Date());
  const through = addDays(today, daysAhead);
  let created = 0;

  for (const schedule of state().schedules.filter(
    (s) => s.familyId === member.familyId && s.active,
  )) {
    const existing = new Set(
      state()
        .sessions.filter((s) => s.scheduleId === schedule.id)
        .map((s) => sessionDateKey(s.scheduledFor)),
    );
    const drafts = generateSessionsFromSchedule({
      schedule,
      existingSessionDates: existing,
      throughDate: through,
    });
    for (const draft of drafts) {
      const sessionId = id("ses");
      const session: ReadingSession = {
        id: sessionId,
        familyId: schedule.familyId,
        scheduleId: schedule.id,
        scheduledFor: draft.scheduledFor,
        status: "scheduled",
        notes: null,
        icsUid: draft.icsUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state().sessions.push(session);
      state().assignments = applyReassignment({
        existing: state().assignments,
        sessionId,
        newMemberIds: [draft.memberId],
      });
      void sendSessionInvite(sessionId, "REQUEST");
      created += 1;
    }
  }
  return created;
}

export function saveSchedule(input: {
  readerRotationMemberIds: string[];
  startDate: string;
  timeLocal: string;
  timezone: string;
  bookTiming: "ahead" | "after";
}): void {
  const member = getCurrentMember();
  if (!member) throw new Error("Join a family first");
  if (member.role !== "owner") {
    throw new Error("Only family owners can edit the schedule");
  }
  if (input.readerRotationMemberIds.length === 0) {
    throw new Error("Pick at least one reader");
  }

  const existing = state().schedules.find(
    (s) => s.familyId === member.familyId && s.active,
  );
  if (existing) {
    existing.active = false;
  }

  state().schedules.push({
    id: id("sch"),
    familyId: member.familyId,
    mode: "together",
    readerRotationMemberIds: input.readerRotationMemberIds,
    startDate: input.startDate,
    timeLocal: input.timeLocal,
    timezone: input.timezone,
    bookTiming: input.bookTiming,
    active: true,
    createdAt: new Date().toISOString(),
  });
  ensureUpcomingSessions(14);
}

async function sendSessionInvite(
  sessionId: string,
  method: "REQUEST" | "CANCEL",
): Promise<void> {
  const session = state().sessions.find((s) => s.id === sessionId);
  if (!session) return;
  const family = state().families.find((f) => f.id === session.familyId);
  const currentAssignees = state().assignments.filter(
    (a) => a.sessionId === sessionId && a.isCurrent,
  );
  const members = currentAssignees
    .map((a) => state().members.find((m) => m.id === a.memberId))
    .filter(Boolean) as FamilyMember[];
  if (members.length === 0 || !family) return;

  const dateLabel = sessionDateKey(session.scheduledFor);
  const ics = buildReadingInviteIcs({
    uid: session.icsUid,
    title: `Bedtime reading · ${family.name}`,
    description: `Reading to the kids for ${family.name}.`,
    startLocal: session.scheduledFor,
    organizerEmail: members[0]!.email,
    organizerName: family.name,
    attendeeEmails: members.map((m) => m.email),
    method,
    sequence: method === "CANCEL" ? 1 : 0,
  });

  const subject = readingInviteSubject({
    familyName: family.name,
    dateLabel,
    cancelled: method === "CANCEL",
  });
  const body =
    method === "CANCEL"
      ? `<p>This bedtime reading session on <strong>${dateLabel}</strong> was cancelled.</p>`
      : `<p>You're on for bedtime reading on <strong>${dateLabel}</strong>.</p><p>A calendar invite is attached.</p>`;

  const result = await sendEmail({
    to: members.map((m) => m.email),
    subject,
    body,
    icsContent: ics,
  });

  state().outboundEmails.push({
    id: id("mail"),
    to: members.map((m) => m.email),
    subject,
    body,
    icsContent: ics,
    createdAt: new Date().toISOString(),
  });

  void result;
}

export function getHomeContext() {
  const user = getCurrentUser();
  const member = getCurrentMember();
  if (!user || !member) {
    return { user, member, nextSession: null as ReadingSession | null, family: null, kids: [] as Kid[], readers: [] as FamilyMember[] };
  }
  const family = state().families.find((f) => f.id === member.familyId) ?? null;
  const nextSession = nextSessionForMember({
    sessions: state().sessions.filter((s) => s.familyId === member.familyId),
    assignments: state().assignments,
    memberId: member.id,
  });
  return {
    user,
    member,
    family,
    nextSession,
    kids: state().kids.filter((k) => k.familyId === member.familyId),
    readers: state().members.filter((m) => m.familyId === member.familyId),
  };
}

export function listFamilySessions() {
  const member = getCurrentMember();
  if (!member) return [];
  return state()
    .sessions.filter((s) => s.familyId === member.familyId)
    .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor));
}

export function getSessionDetail(sessionId: string) {
  const member = getCurrentMember();
  if (!member) return null;
  const session = state().sessions.find(
    (s) => s.id === sessionId && s.familyId === member.familyId,
  );
  if (!session) return null;
  const assignments = state().assignments.filter((a) => a.sessionId === sessionId);
  const books = state().sessionBooks.filter((b) => b.sessionId === sessionId);
  const corrections = state().corrections.filter((c) => c.sessionId === sessionId);
  const memberNames = Object.fromEntries(
    state()
      .members.filter((m) => m.familyId === member.familyId)
      .map((m) => [m.id, m.displayName]),
  );
  const library = state().books.filter((b) => b.familyId === member.familyId);
  return {
    session,
    assignments,
    books,
    corrections,
    memberNames,
    library,
    readers: state().members.filter((m) => m.familyId === member.familyId),
  };
}

export async function cancelSession(sessionId: string): Promise<void> {
  const detail = getSessionDetail(sessionId);
  if (!detail) throw new Error("Session not found");
  assertTransition(detail.session.status, "cancelled");
  detail.session.status = "cancelled";
  detail.session.updatedAt = new Date().toISOString();
  await sendSessionInvite(sessionId, "CANCEL");
}

export async function updateSession(input: {
  sessionId: string;
  memberIds: string[];
  bookIds: string[];
  freeformTitles: string[];
  notes: string | null;
  status: "scheduled" | "completed" | "cancelled";
  reason?: string;
}): Promise<void> {
  const member = getCurrentMember();
  if (!member) throw new Error("Not signed in");
  const detail = getSessionDetail(input.sessionId);
  if (!detail) throw new Error("Session not found");

  const before = {
    status: detail.session.status,
    currentMemberIds: detail.assignments
      .filter((a) => a.isCurrent)
      .map((a) => a.memberId)
      .sort(),
    bookTitles: detail.books.map(
      (b) =>
        b.titleFreeform ??
        detail.library.find((x) => x.id === b.bookId)?.title ??
        "Unknown",
    ),
    notes: detail.session.notes,
  };

  assertTransition(detail.session.status, input.status);
  detail.session.status = input.status;
  detail.session.notes = input.notes;
  detail.session.updatedAt = new Date().toISOString();

  state().assignments = applyReassignment({
    existing: state().assignments,
    sessionId: input.sessionId,
    newMemberIds: input.memberIds,
  });

  state().sessionBooks = state().sessionBooks.filter(
    (b) => b.sessionId !== input.sessionId,
  );
  for (const bookId of input.bookIds) {
    state().sessionBooks.push({
      id: id("sb"),
      sessionId: input.sessionId,
      bookId,
      titleFreeform: null,
      createdAt: new Date().toISOString(),
    });
  }
  for (const title of input.freeformTitles.filter(Boolean)) {
    state().sessionBooks.push({
      id: id("sb"),
      sessionId: input.sessionId,
      bookId: null,
      titleFreeform: title,
      createdAt: new Date().toISOString(),
    });
  }

  const after = {
    status: detail.session.status,
    currentMemberIds: [...input.memberIds].sort(),
    bookTitles: [
      ...input.bookIds.map(
        (id) => detail.library.find((b) => b.id === id)?.title ?? "Unknown",
      ),
      ...input.freeformTitles.filter(Boolean),
    ],
    notes: detail.session.notes,
  };

  if (isPastSession(detail.session.scheduledFor) || before.status === "completed") {
    const correction = buildCorrectionRecord({
      sessionId: input.sessionId,
      correctedByMemberId: member.id,
      reason: input.reason ?? "Corrected after the fact",
      before,
      after,
    });
    state().corrections.push({ id: id("cor"), ...correction });
  }

  if (input.status === "cancelled") {
    await sendSessionInvite(input.sessionId, "CANCEL");
  } else if (!isPastSession(detail.session.scheduledFor)) {
    await sendSessionInvite(input.sessionId, "REQUEST");
  }
}

export function getDashboard(filter: DashboardFilter) {
  const member = getCurrentMember();
  if (!member) return null;
  const familyId = member.familyId;
  return {
    stats: computeDashboardStats({
      sessions: state().sessions.filter((s) => s.familyId === familyId),
      assignments: state().assignments,
      sessionBooks: state().sessionBooks,
      books: state().books.filter((b) => b.familyId === familyId),
      filter,
    }),
    readers: state().members.filter((m) => m.familyId === familyId),
    member,
  };
}

export function getLibrary() {
  const member = getCurrentMember();
  if (!member) return [];
  return state().books.filter((b) => b.familyId === member.familyId);
}

export function getFamilyAdmin() {
  const member = getCurrentMember();
  if (!member) return null;
  return {
    member,
    family: state().families.find((f) => f.id === member.familyId)!,
    readers: state().members.filter((m) => m.familyId === member.familyId),
    kids: state().kids.filter((k) => k.familyId === member.familyId),
    invites: state().invites.filter((i) => i.familyId === member.familyId),
    schedule: state().schedules.find(
      (s) => s.familyId === member.familyId && s.active,
    ),
  };
}

export function createInviteCode(): string {
  const member = getCurrentMember();
  if (!member) throw new Error("Not signed in");
  const code = generateInviteCode();
  state().invites.push({
    id: id("inv"),
    familyId: member.familyId,
    code,
    createdByMemberId: member.id,
    expiresAt: null,
    maxUses: 25,
    uses: 0,
    createdAt: new Date().toISOString(),
  });
  return code;
}

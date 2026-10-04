import { assertScheduleSettings } from "@/lib/domain/schedule-settings";
import { dateInTimezone } from "@/lib/domain/calendar-date";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { applyReassignment, buildCorrectionRecord } from "@/lib/domain/corrections";
import { generateInviteCode } from "@/lib/domain/invites";
import { addDays } from "@/lib/domain/rotation";
import {
  assertTransition,
  generateSessionsFromSchedule,
  isPastSession,
  nextSessionForMember,
  sessionDateKey,
} from "@/lib/domain/sessions";
import { computeDashboardStats } from "@/lib/domain/stats";
import { sendSessionInviteEmail } from "@/lib/session-mail";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  mapAssignment,
  mapBook,
  mapCorrection,
  mapFamily,
  mapInvite,
  mapKid,
  mapMember,
  mapSchedule,
  mapSession,
  mapSessionBook,
  partitionAssignmentWrites,
  toWallClock,
} from "@/lib/supabase/map";
import type {
  Book,
  DashboardFilter,
  Family,
  FamilyMember,
  Kid,
  ReadingSession,
  Schedule,
  SessionAssignment,
  SessionBook,
  SessionCorrection,
  UserAccount,
} from "@/lib/types";

type Row = Record<string, unknown>;
interface ScheduleChange {
  session_id: string;
  cancelled: boolean;
  removed_member_ids: string[];
  previous_scheduled_for: string;
}

function assertNoError(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback);
}

function userFromAuth(user: User): UserAccount {
  const meta = user.user_metadata ?? {};
  const displayName =
    (typeof meta.display_name === "string" && meta.display_name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    user.email?.split("@")[0] ||
    "Reader";
  return {
    id: user.id,
    email: user.email ?? "",
    displayName,
    passwordHash: null,
    createdAt: user.created_at,
  };
}

async function loadContext(client?: SupabaseClient) {
  const supabase = client ?? (await createClient());
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      supabase,
      account: null as UserAccount | null,
      member: null as FamilyMember | null,
    };
  }
  const account = userFromAuth(user);
  const { data, error: memberError } = await supabase
    .from("family_members")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  assertNoError(memberError, "Could not load family membership");
  return {
    supabase,
    account,
    member: data ? mapMember(data as Row) : null,
  };
}

function requireMember(ctx: Awaited<ReturnType<typeof loadContext>>) {
  if (!ctx.account) throw new Error("Not signed in");
  if (!ctx.member) throw new Error("Join a family first");
  return { supabase: ctx.supabase, account: ctx.account, member: ctx.member };
}

function requireOwner(member: FamilyMember): void {
  if (member.role !== "owner") {
    throw new Error("Only family owners can do that");
  }
}

async function rows<T>(
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  map: (row: Row) => T,
  fallback: string,
): Promise<T[]> {
  const { data, error } = await query;
  assertNoError(error, fallback);
  return ((data ?? []) as Row[]).map(map);
}

export async function getCurrentUser(): Promise<UserAccount | null> {
  const ctx = await loadContext();
  return ctx.account;
}

export async function getCurrentMember(): Promise<FamilyMember | null> {
  const ctx = await loadContext();
  return ctx.member;
}

async function familyReaders(
  supabase: SupabaseClient,
  familyId: string,
): Promise<FamilyMember[]> {
  return rows(
    supabase.from("family_members").select("*").eq("family_id", familyId),
    mapMember,
    "Could not load readers",
  );
}

async function familySessions(
  supabase: SupabaseClient,
  familyId: string,
): Promise<ReadingSession[]> {
  const sessions = await rows(
    supabase
      .from("reading_sessions")
      .select("*")
      .eq("family_id", familyId)
      .order("scheduled_for", { ascending: false }),
    mapSession,
    "Could not load sessions",
  );
  return sessions;
}

async function assignmentsForSessions(
  supabase: SupabaseClient,
  sessionIds: string[],
): Promise<SessionAssignment[]> {
  if (sessionIds.length === 0) return [];
  return rows(
    supabase.from("session_assignments").select("*").in("session_id", sessionIds),
    mapAssignment,
    "Could not load assignments",
  );
}

export async function getHomeContext() {
  const ctx = await loadContext();
  if (!ctx.account || !ctx.member) {
    return {
      user: ctx.account,
      member: ctx.member,
      nextSession: null as ReadingSession | null,
      family: null as Family | null,
      kids: [] as Kid[],
      readers: [] as FamilyMember[],
      assignments: [] as SessionAssignment[],
      sessionBooks: [] as SessionBook[],
      corrections: [] as SessionCorrection[],
      books: [] as Book[],
    };
  }

  const { supabase, member } = ctx;
  const [familyRow, kids, readers, sessions] = await Promise.all([
    supabase.from("families").select("*").eq("id", member.familyId).maybeSingle(),
    rows(
      supabase.from("kids").select("*").eq("family_id", member.familyId),
      mapKid,
      "Could not load kids",
    ),
    familyReaders(supabase, member.familyId),
    familySessions(supabase, member.familyId),
  ]);
  assertNoError(familyRow.error, "Could not load family");

  const assignments = await assignmentsForSessions(
    supabase,
    sessions.map((session) => session.id),
  );
  const nextSession = nextSessionForMember({
    sessions,
    assignments,
    memberId: member.id,
  });

  const [sessionBooks, corrections, books] = nextSession
    ? await Promise.all([
        rows(
          supabase.from("session_books").select("*").eq("session_id", nextSession.id),
          mapSessionBook,
          "Could not load session books",
        ),
        rows(
          supabase
            .from("session_corrections")
            .select("*")
            .eq("session_id", nextSession.id),
          mapCorrection,
          "Could not load corrections",
        ),
        rows(
          supabase.from("books").select("*").eq("family_id", member.familyId),
          mapBook,
          "Could not load books",
        ),
      ])
    : [[], [], []];

  return {
    user: ctx.account,
    member,
    family: familyRow.data ? mapFamily(familyRow.data as Row) : null,
    nextSession,
    kids,
    readers,
    assignments: nextSession
      ? assignments.filter((row) => row.sessionId === nextSession.id)
      : [],
    sessionBooks,
    corrections,
    books,
  };
}

export async function getFamilyAdmin() {
  const { supabase, member } = requireMember(await loadContext());
  const [familyRow, readers, kids, invites, schedules] = await Promise.all([
    supabase.from("families").select("*").eq("id", member.familyId).single(),
    familyReaders(supabase, member.familyId),
    rows(
      supabase.from("kids").select("*").eq("family_id", member.familyId),
      mapKid,
      "Could not load kids",
    ),
    rows(
      supabase.from("invite_codes").select("*").eq("family_id", member.familyId),
      mapInvite,
      "Could not load invites",
    ),
    rows(
      supabase
        .from("schedules")
        .select("*")
        .eq("family_id", member.familyId)
        .eq("active", true)
        .limit(1),
      mapSchedule,
      "Could not load schedule",
    ),
  ]);
  assertNoError(familyRow.error, "Could not load family");
  return {
    member,
    family: mapFamily(familyRow.data as Row),
    readers,
    kids,
    invites,
    schedule: schedules[0] ?? null,
  };
}

export async function listFamilySessions(): Promise<ReadingSession[]> {
  const { supabase, member } = requireMember(await loadContext());
  return familySessions(supabase, member.familyId);
}

export async function listFamilyAssignments(): Promise<SessionAssignment[]> {
  const { supabase, member } = requireMember(await loadContext());
  const sessions = await familySessions(supabase, member.familyId);
  return assignmentsForSessions(
    supabase,
    sessions.map((session) => session.id),
  );
}

export async function getLibrary(): Promise<Book[]> {
  const { supabase, member } = requireMember(await loadContext());
  return rows(
    supabase.from("books").select("*").eq("family_id", member.familyId),
    mapBook,
    "Could not load library",
  );
}

export async function getDashboard(filter: DashboardFilter) {
  const { supabase, member } = requireMember(await loadContext());
  const [sessions, readers, books] = await Promise.all([
    familySessions(supabase, member.familyId),
    familyReaders(supabase, member.familyId),
    rows(
      supabase.from("books").select("*").eq("family_id", member.familyId),
      mapBook,
      "Could not load books",
    ),
  ]);
  const sessionIds = sessions.map((session) => session.id);
  const assignments = await assignmentsForSessions(supabase, sessionIds);
  const sessionBooks =
    sessionIds.length === 0
      ? []
      : await rows(
          supabase.from("session_books").select("*").in("session_id", sessionIds),
          mapSessionBook,
          "Could not load session books",
        );
  return {
    stats: computeDashboardStats({
      sessions,
      assignments,
      sessionBooks: sessions.length === 0 ? [] : sessionBooks,
      books,
      filter,
    }),
    readers,
    member,
  };
}

export async function getSessionDetail(sessionId: string) {
  const ctx = await loadContext();
  if (!ctx.member) return null;
  const { supabase, member } = ctx;
  const { data, error } = await supabase
    .from("reading_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("family_id", member.familyId)
    .maybeSingle();
  assertNoError(error, "Could not load session");
  if (!data) return null;

  const [assignments, books, corrections, readers, library] = await Promise.all([
    rows(
      supabase.from("session_assignments").select("*").eq("session_id", sessionId),
      mapAssignment,
      "Could not load assignments",
    ),
    rows(
      supabase.from("session_books").select("*").eq("session_id", sessionId),
      mapSessionBook,
      "Could not load session books",
    ),
    rows(
      supabase.from("session_corrections").select("*").eq("session_id", sessionId),
      mapCorrection,
      "Could not load corrections",
    ),
    familyReaders(supabase, member.familyId),
    rows(
      supabase.from("books").select("*").eq("family_id", member.familyId),
      mapBook,
      "Could not load library",
    ),
  ]);

  return {
    session: mapSession(data as Row),
    assignments,
    books,
    corrections,
    memberNames: Object.fromEntries(
      readers.map((reader) => [reader.id, reader.displayName]),
    ),
    library,
    readers,
  };
}

async function sendInvite(
  supabase: SupabaseClient,
  sessionId: string,
  method: "REQUEST" | "CANCEL",
  previous?: { memberIds: string[]; scheduledFor: string },
): Promise<void> {
  const { data: sessionRow, error } = await supabase
    .from("reading_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  assertNoError(error, "Could not load session for invite");
  if (!sessionRow) return;
  const session = mapSession(sessionRow as Row);
  const { data: familyRow } = await supabase
    .from("families")
    .select("*")
    .eq("id", session.familyId)
    .maybeSingle();
  if (!familyRow) return;
  const family = mapFamily(familyRow as Row);
  const assignments = await rows(
    supabase
      .from("session_assignments")
      .select("*")
      .eq("session_id", sessionId)
      .eq("is_current", true),
    mapAssignment,
    "Could not load assignees",
  );
  const readers = await familyReaders(supabase, session.familyId);
  const attendees = (previous?.memberIds ?? assignments.map((a) => a.memberId))
    .map((memberId) => readers.find((reader) => reader.id === memberId))
    .filter((reader): reader is FamilyMember => Boolean(reader))
    .map((reader) => ({ email: reader.email, displayName: reader.displayName }));

  const sent = await sendSessionInviteEmail({
    familyName: family.name,
    scheduledFor: previous?.scheduledFor ?? session.scheduledFor,
    icsUid: session.icsUid,
    attendees,
    method,
  });
  if (sent && !sent.result.ok) {
    console.error("[plunk]", sent.result.error);
  }
}

async function insertGeneratedSessions(
  supabase: SupabaseClient,
  schedules: Schedule[],
  daysAhead: number,
): Promise<number> {
  let created = 0;

  for (const schedule of schedules) {
    const today = dateInTimezone(new Date(), schedule.timezone);
    const through = addDays(today, daysAhead);
    const { data: existingRows, error: existingError } = await supabase
      .from("reading_sessions")
      .select("scheduled_for")
      .eq("schedule_id", schedule.id);
    assertNoError(existingError, "Could not load existing sessions");
    const existing = new Set(
      ((existingRows ?? []) as Row[]).map((row) =>
        sessionDateKey(toWallClock(String(row.scheduled_for ?? ""))),
      ),
    );
    const drafts = generateSessionsFromSchedule({
      schedule,
      existingSessionDates: existing,
      throughDate: through,
      nowDate: today,
    });

    for (const draft of drafts) {
      const { data, error } = await supabase
        .from("reading_sessions")
        .insert({
          family_id: schedule.familyId,
          schedule_id: schedule.id,
          scheduled_for: `${draft.scheduledFor}+00:00`,
          status: "scheduled",
          ics_uid: draft.icsUid,
        })
        .select("id")
        .single();
      assertNoError(error, "Could not create session");
      const sessionId = String((data as Row).id);
      const { error: assignmentError } = await supabase
        .from("session_assignments")
        .insert({
          session_id: sessionId,
          member_id: draft.memberId,
          is_original: true,
          is_current: true,
        });
      assertNoError(assignmentError, "Could not assign reader");
      await sendInvite(supabase, sessionId, "REQUEST");
      created += 1;
    }
  }

  return created;
}

export async function ensureAllUpcomingSessions(daysAhead = 14): Promise<number> {
  const supabase = createServiceClient();
  const schedules = await rows(
    supabase.from("schedules").select("*").eq("active", true),
    mapSchedule,
    "Could not load schedules",
  );
  return insertGeneratedSessions(supabase, schedules, daysAhead);
}

export async function createFamily(name: string): Promise<void> {
  const ctx = await loadContext();
  if (!ctx.account) throw new Error("Not signed in");
  if (ctx.member) throw new Error("Already in a family");
  const { error } = await ctx.supabase.rpc("create_family", {
    family_name: name.trim(),
    display_name: ctx.account.displayName,
  });
  assertNoError(error, "Could not create family");

  const member = await getCurrentMember();
  if (!member) throw new Error("Family was created without a membership");
  const code = generateInviteCode();
  const { error: inviteError } = await ctx.supabase.from("invite_codes").insert({
    family_id: member.familyId,
    code,
    role: "reader",
    created_by_member_id: member.id,
    max_uses: 25,
    uses: 0,
  });
  assertNoError(inviteError, "Could not create the first invite code");
}

export async function joinFamily(codeRaw: string): Promise<void> {
  const ctx = await loadContext();
  if (!ctx.account) throw new Error("Not signed in");
  if (ctx.member) throw new Error("Already in a family");
  const { error } = await ctx.supabase.rpc("join_family", {
    raw_code: codeRaw,
    display_name: ctx.account.displayName,
  });
  assertNoError(error, "Could not join family");
}

export async function addKid(name: string, age: number): Promise<void> {
  const { supabase, member } = requireMember(await loadContext());
  requireOwner(member);
  if (!name.trim() || !Number.isInteger(age) || age < 0 || age > 18)
    throw new Error("Enter a name and age from 0 to 18");
  const { error } = await supabase.from("kids").insert({
    family_id: member.familyId,
    name: name.trim(),
    age,
  });
  assertNoError(error, "Could not add kid");
}

export async function createInviteCode(
  role: "owner" | "reader" = "reader",
): Promise<string> {
  const { supabase, member } = requireMember(await loadContext());
  requireOwner(member);
  const code = generateInviteCode();
  const { error } = await supabase.from("invite_codes").insert({
    family_id: member.familyId,
    code,
    role,
    created_by_member_id: member.id,
    max_uses: 25,
    uses: 0,
  });
  assertNoError(error, "Could not create invite");
  return code;
}

export async function addBookFromSearch(input: {
  title: string;
  authors: string[];
  openLibraryKey: string | null;
  coverUrl: string | null;
  isbn: string | null;
}): Promise<void> {
  const { supabase, member } = requireMember(await loadContext());
  const { error } = await supabase.from("books").insert({
    family_id: member.familyId,
    title: input.title,
    authors: input.authors,
    open_library_key: input.openLibraryKey,
    cover_url: input.coverUrl,
    isbn: input.isbn,
  });
  assertNoError(error, "Could not add book");
}

export async function saveSchedule(input: {
  readerRotationMemberIds: string[];
  startDate: string;
  timeLocal: string;
  timezone: string;
  bookTiming: "ahead" | "after";
}): Promise<void> {
  const { supabase, member } = requireMember(await loadContext());
  requireOwner(member);
  assertScheduleSettings(input);
  if (input.readerRotationMemberIds.length === 0) {
    throw new Error("Pick at least one reader");
  }

  const { data, error } = await supabase.rpc("manage_schedule", {
    rotation_ids: input.readerRotationMemberIds,
    starts_on: input.startDate,
    bedtime: input.timeLocal,
    zone: input.timezone,
    timing: input.bookTiming,
    deleting: false,
  });
  assertNoError(error, "Could not save schedule");
  for (const changed of (data ?? []) as ScheduleChange[]) {
    if (changed.removed_member_ids.length)
      await sendInvite(supabase, changed.session_id, "CANCEL", {
        memberIds: changed.removed_member_ids,
        scheduledFor: toWallClock(changed.previous_scheduled_for),
      });
    if (!changed.cancelled) await sendInvite(supabase, changed.session_id, "REQUEST");
  }
  const admin = await getFamilyAdmin();
  if (admin.schedule) await insertGeneratedSessions(supabase, [admin.schedule], 14);
}

async function persistAssignments(
  supabase: SupabaseClient,
  sessionId: string,
  existing: SessionAssignment[],
  memberIds: string[],
): Promise<void> {
  const next = applyReassignment({
    existing,
    sessionId,
    newMemberIds: memberIds,
  }).filter((row) => row.sessionId === sessionId);
  const { updates, inserts } = partitionAssignmentWrites(next);

  for (const row of updates) {
    const { error } = await supabase
      .from("session_assignments")
      .update({ is_current: row.isCurrent })
      .eq("id", row.id);
    assertNoError(error, "Could not update assignment");
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("session_assignments").insert(
      inserts.map((row) => ({
        session_id: row.sessionId,
        member_id: row.memberId,
        is_original: row.isOriginal,
        is_current: row.isCurrent,
      })),
    );
    assertNoError(error, "Could not add assignment");
  }
}

export async function cancelSession(sessionId: string): Promise<void> {
  const detail = await getSessionDetail(sessionId);
  if (!detail) throw new Error("Session not found");
  assertTransition(detail.session.status, "cancelled");
  const { supabase } = requireMember(await loadContext());
  const { error } = await supabase
    .from("reading_sessions")
    .update({
      status: "cancelled",
      cancellation_source: "individual",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  assertNoError(error, "Could not cancel session");
  await sendInvite(supabase, sessionId, "CANCEL");
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
  const { supabase, member } = requireMember(await loadContext());
  const detail = await getSessionDetail(input.sessionId);
  if (!detail) throw new Error("Session not found");

  const before = {
    status: detail.session.status,
    currentMemberIds: detail.assignments
      .filter((row) => row.isCurrent)
      .map((row) => row.memberId)
      .sort(),
    bookTitles: detail.books.map(
      (book) =>
        book.titleFreeform ??
        detail.library.find((item) => item.id === book.bookId)?.title ??
        "Unknown",
    ),
    notes: detail.session.notes,
  };

  assertTransition(detail.session.status, input.status);
  const { error } = await supabase
    .from("reading_sessions")
    .update({
      status: input.status,
      cancellation_source: input.status === "cancelled" ? "individual" : null,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.sessionId);
  assertNoError(error, "Could not update session");

  await persistAssignments(
    supabase,
    input.sessionId,
    detail.assignments,
    input.memberIds,
  );

  const { error: clearError } = await supabase
    .from("session_books")
    .delete()
    .eq("session_id", input.sessionId);
  assertNoError(clearError, "Could not update books");

  const bookRows = [
    ...input.bookIds.map((bookId) => ({
      session_id: input.sessionId,
      book_id: bookId,
      title_freeform: null,
    })),
    ...input.freeformTitles.filter(Boolean).map((title) => ({
      session_id: input.sessionId,
      book_id: null,
      title_freeform: title,
    })),
  ];
  if (bookRows.length > 0) {
    const { error: bookError } = await supabase.from("session_books").insert(bookRows);
    assertNoError(bookError, "Could not save books");
  }

  const after = {
    status: input.status,
    currentMemberIds: [...input.memberIds].sort(),
    bookTitles: [
      ...input.bookIds.map(
        (id) => detail.library.find((book) => book.id === id)?.title ?? "Unknown",
      ),
      ...input.freeformTitles.filter(Boolean),
    ],
    notes: input.notes,
  };

  if (isPastSession(detail.session.scheduledFor) || before.status === "completed") {
    const correction = buildCorrectionRecord({
      sessionId: input.sessionId,
      correctedByMemberId: member.id,
      reason: input.reason ?? "Corrected after the fact",
      before,
      after,
    });
    const { error: correctionError } = await supabase.from("session_corrections").insert({
      session_id: correction.sessionId,
      corrected_by_member_id: correction.correctedByMemberId,
      reason: correction.reason,
      before: correction.before,
      after: correction.after,
    });
    assertNoError(correctionError, "Could not record correction");
  }

  if (input.status === "cancelled") {
    await sendInvite(supabase, input.sessionId, "CANCEL");
  } else if (!isPastSession(detail.session.scheduledFor)) {
    await sendInvite(supabase, input.sessionId, "REQUEST");
  }
}

export async function deleteSchedule(): Promise<void> {
  const { supabase, member } = requireMember(await loadContext());
  requireOwner(member);
  const { data, error } = await supabase.rpc("manage_schedule", { deleting: true });
  assertNoError(error, "Could not delete schedule");
  for (const row of (data ?? []) as ScheduleChange[]) {
    if (row.removed_member_ids.length)
      await sendInvite(supabase, row.session_id, "CANCEL", {
        memberIds: row.removed_member_ids,
        scheduledFor: toWallClock(row.previous_scheduled_for),
      });
  }
}

export async function updateMember(
  memberId: string,
  displayName: string,
  role: "owner" | "reader",
): Promise<void> {
  const { supabase, member } = requireMember(await loadContext());
  requireOwner(member);
  const { error } = await supabase.rpc("update_family_member", {
    target_id: memberId,
    new_name: displayName.trim(),
    new_role: role,
  });
  assertNoError(error, "Could not update reader");
}

export async function updateKid(kidId: string, name: string, age: number): Promise<void> {
  const { supabase, member } = requireMember(await loadContext());
  requireOwner(member);
  if (!name.trim() || !Number.isInteger(age) || age < 0 || age > 18)
    throw new Error("Enter a name and age from 0 to 18");
  const { data, error } = await supabase
    .from("kids")
    .update({ name: name.trim(), age })
    .eq("id", kidId)
    .eq("family_id", member.familyId)
    .select("id");
  assertNoError(error, "Could not update child");
  if (!data?.length) throw new Error("Child not found");
}

export async function deleteKid(kidId: string): Promise<void> {
  const { supabase, member } = requireMember(await loadContext());
  requireOwner(member);
  const { data, error } = await supabase
    .from("kids")
    .delete()
    .eq("id", kidId)
    .eq("family_id", member.familyId)
    .select("id");
  assertNoError(error, "Could not delete child");
  if (!data?.length) throw new Error("Child not found");
}

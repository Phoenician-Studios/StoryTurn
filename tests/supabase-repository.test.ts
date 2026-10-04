import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sendSessionInviteEmail } from "@/lib/session-mail";
import { ensureAllUpcomingSessions, saveSchedule } from "@/lib/supabase/repository";
type Row = Record<string, unknown>;
const fixture = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  changes: [] as Row[],
}));
function client() {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "user",
            email: "parent@example.com",
            created_at: "",
            user_metadata: {},
          },
        },
        error: null,
      }),
    },
    rpc: async () => ({ data: fixture.changes, error: null }),
    from(table: string) {
      const filters: ((r: Row) => boolean)[] = [];
      let one = false;
      let limit = Infinity;
      const builder = {
        select: () => builder,
        eq: (key: string, value: unknown) => {
          filters.push((r) => r[key] === value);
          return builder;
        },
        in: (key: string, values: unknown[]) => {
          filters.push((r) => values.includes(r[key]));
          return builder;
        },
        order: () => builder,
        limit: (value: number) => {
          limit = value;
          return builder;
        },
        insert: (values: Row | Row[]) => {
          const list = Array.isArray(values) ? values : [values];
          fixture.tables[table] ??= [];
          fixture.tables[table].push(
            ...list.map((r) => ({
              id: `${table}-${fixture.tables[table].length}`,
              ...r,
            })),
          );
          return builder;
        },
        single: () => {
          one = true;
          return builder;
        },
        maybeSingle: () => {
          one = true;
          return builder;
        },
        then: (
          resolve: (result: { data: Row[] | Row | null; error: null }) => unknown,
        ) => {
          const data = (fixture.tables[table] ?? [])
            .filter((r) => filters.every((f) => f(r)))
            .slice(0, limit);
          return Promise.resolve({
            data: one ? (data.at(-1) ?? null) : data,
            error: null,
          }).then(resolve);
        },
      };
      return builder;
    },
  };
}
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => client() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => client() }));
vi.mock("@/lib/session-mail", () => ({
  sendSessionInviteEmail: vi.fn(async () => null),
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-05T02:00:00Z"));
  vi.clearAllMocks();
  fixture.changes = [];
  fixture.tables = {
    schedules: [
      {
        id: "schedule",
        family_id: "family",
        active: true,
        timezone: "America/Los_Angeles",
        start_date: "2026-10-04",
        time_local: "19:30",
        reader_rotation_member_ids: ["parent"],
        book_timing: "after",
      },
    ],
    family_members: [
      {
        id: "parent",
        user_id: "user",
        family_id: "family",
        display_name: "Parent",
        email: "parent@example.com",
        role: "owner",
      },
      {
        id: "reader",
        family_id: "family",
        email: "reader@example.com",
        display_name: "Reader",
        role: "reader",
      },
    ],
    reading_sessions: [],
    session_assignments: [],
    families: [],
  };
});
afterEach(() => vi.useRealTimers());
it("generates tonight and the horizon from each schedule's local calendar date", async () => {
  expect(await ensureAllUpcomingSessions(1)).toBe(2);
  expect(
    fixture.tables.reading_sessions.map((r) => String(r.scheduled_for).slice(0, 10)),
  ).toEqual(["2026-10-04", "2026-10-05"]);
});
it("uses the RPC's former readers to send cancellations before updated requests", async () => {
  fixture.tables.schedules[0].start_date = "2030-01-01";
  fixture.tables.families = [{ id: "family", name: "Family" }];
  fixture.tables.reading_sessions = [
    {
      id: "night",
      family_id: "family",
      schedule_id: "schedule",
      scheduled_for: "2026-10-04T20:30:00+00:00",
      status: "scheduled",
      ics_uid: "uid",
    },
  ];
  fixture.tables.session_assignments = [
    { id: "new", session_id: "night", member_id: "reader", is_current: true },
  ];
  fixture.changes = [
    {
      session_id: "night",
      cancelled: false,
      removed_member_ids: ["parent"],
      previous_scheduled_for: "2026-10-04T19:30:00+00:00",
    },
  ];
  await saveSchedule({
    readerRotationMemberIds: ["reader"],
    startDate: "2030-01-01",
    timeLocal: "20:30",
    timezone: "America/Los_Angeles",
    bookTiming: "after",
  });
  const messages = vi.mocked(sendSessionInviteEmail).mock.calls.map(([input]) => input);
  expect(messages).toHaveLength(2);
  expect(messages[0]).toMatchObject({
    method: "CANCEL",
    scheduledFor: "2026-10-04T19:30:00",
    attendees: [{ email: "parent@example.com" }],
  });
  expect(messages[1]).toMatchObject({
    method: "REQUEST",
    attendees: [{ email: "reader@example.com" }],
  });
});

import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, expect, it } from "vitest";
let db: PGlite;
const owner = "00000000-0000-0000-0000-000000000001";
const reader = "00000000-0000-0000-0000-000000000002";
let fid: string;
let mid: string;
let rid: string;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `set timezone = 'UTC'; create schema auth; create table auth.users (id uuid primary key, email text); create role authenticated; create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;`,
  );
  for (const file of [
    "001_init.sql",
    "002_family_bootstrap.sql",
    "003_family_management.sql",
    "004_schedule_cancellation_intent.sql",
    "005_calendar_sequence.sql",
    "006_schedule_books.sql",
  ])
    await db.exec(
      readFileSync(`supabase/migrations/${file}`, "utf8").replace(
        'create extension if not exists "pgcrypto";',
        "",
      ),
    );
  await db.query(
    "insert into auth.users values ($1, 'owner@example.com'), ($2, 'reader@example.com')",
    [owner, reader],
  );
  await db.query("select set_config('test.uid', $1, false)", [owner]);
  fid = (
    await db.query<{ id: string }>(
      "select public.create_family('Family', 'Parent') as id",
    )
  ).rows[0].id;
  mid = (
    await db.query<{ id: string }>("select id from family_members where user_id = $1", [
      owner,
    ])
  ).rows[0].id;
  rid = (
    await db.query<{ id: string }>(
      "insert into family_members(family_id, user_id, display_name, email, role) values ($1,$2,'Reader','reader@example.com','reader') returning id",
      [fid, reader],
    )
  ).rows[0].id;
}, 20000);
afterAll(async () => {
  await db?.close();
});
it("enforces parent permissions and prevents demoting the last parent", async () => {
  await expect(
    db.query("select update_family_member($1,'Parent','reader')", [mid]),
  ).rejects.toThrow(/last parent/);
  await db.query("select set_config('test.uid', $1, false)", [reader]);
  await expect(
    db.query("select * from manage_schedule(deleting => true)"),
  ).rejects.toThrow(/owner/);
  await db.query("select set_config('test.uid', $1, false)", [owner]);
});
it("edits schedule nights in place then cancels future nights without deleting history", async () => {
  await db.query(
    "select * from manage_schedule($1::uuid[], current_date, '19:30', 'America/Chicago', 'after')",
    [[mid]],
  );
  const sid = (await db.query<{ id: string }>("select id from schedules where active"))
    .rows[0].id;
  const session = (
    await db.query<{ id: string }>(
      "insert into reading_sessions(family_id,schedule_id,scheduled_for,status,ics_uid) values ($1,$2,current_date + time '19:30','scheduled','test-uid') returning id",
      [fid, sid],
    )
  ).rows[0].id;
  await db.query(
    "insert into session_assignments(session_id,member_id,is_original,is_current) values ($1,$2,true,true)",
    [session, mid],
  );
  await db.query(
    "select * from manage_schedule($1::uuid[], current_date, '20:00', 'America/Chicago', 'after')",
    [[rid]],
  );
  expect(
    (await db.query<{ id: string }>("select id from schedules where active")).rows[0].id,
  ).toBe(sid);
  expect(
    (
      await db.query<{ time: string }>(
        "select scheduled_for::time::text as time from reading_sessions where id=$1",
        [session],
      )
    ).rows[0].time,
  ).toBe("20:00:00");
  expect(
    (
      await db.query<{ member_id: string }>(
        "select member_id from session_assignments where session_id=$1 and is_current",
        [session],
      )
    ).rows[0].member_id,
  ).toBe(rid);
  expect(
    (
      await db.query(
        "select * from session_assignments where session_id=$1 and is_original",
        [session],
      )
    ).rows,
  ).toHaveLength(1);
  await db.query("select * from manage_schedule(deleting => true)");
  expect(
    (
      await db.query<{ status: string }>(
        "select status from reading_sessions where id=$1",
        [session],
      )
    ).rows[0].status,
  ).toBe("cancelled");
});
it("rejects foreign readers atomically", async () => {
  await expect(
    db.query(
      "select * from manage_schedule($1::uuid[], current_date, '19:30', 'America/Chicago', 'after')",
      [[owner]],
    ),
  ).rejects.toThrow(/reader/);
  expect((await db.query("select * from schedules where active")).rows).toHaveLength(0);
});
it("lets a new parent join with a parent invitation", async () => {
  const uid = "00000000-0000-0000-0000-000000000003";
  await db.query("insert into auth.users values ($1,'parent@example.com')", [uid]);
  await db.query(
    "insert into invite_codes(family_id,code,created_by_member_id,role) values($1,'PARENT',$2,'owner')",
    [fid, mid],
  );
  await db.query("select set_config('test.uid', $1, false)", [uid]);
  await db.query("select join_family('PARENT','New parent')");
  expect(
    (
      await db.query<{ role: string }>(
        "select role from family_members where user_id=$1",
        [uid],
      )
    ).rows[0].role,
  ).toBe("owner");
});

it("restarts a deleted schedule using its original session IDs", async () => {
  await db.query("select set_config('test.uid', $1, false)", [owner]);
  const before = (
    await db.query<{ id: string }>("select id from reading_sessions")
  ).rows.map((r) => r.id);
  await db.query(
    "select * from manage_schedule($1::uuid[], current_date, '21:00', 'America/Chicago', 'after')",
    [[mid]],
  );
  expect(
    (
      await db.query<{ id: string }>(
        "select id from reading_sessions where status='scheduled'",
      )
    ).rows.map((r) => r.id),
  ).toEqual(before);
});

it("returns removed readers for calendar cancellations", async () => {
  const result = await db.query<{ removed_member_ids: string[] }>(
    "select * from manage_schedule($1::uuid[], current_date, '20:00', 'America/Chicago', 'after')",
    [[rid]],
  );
  expect(result.rows[0].removed_member_ids).toEqual([mid]);
});
it("restores schedule cancellations when moving the start date back, but keeps individual cancellations", async () => {
  await db.query(
    "select * from manage_schedule($1::uuid[], current_date + 1, '20:00', 'America/Chicago', 'after')",
    [[rid]],
  );
  await db.query(
    "select * from manage_schedule($1::uuid[], current_date, '20:00', 'America/Chicago', 'after')",
    [[rid]],
  );
  expect(
    (await db.query<{ status: string }>("select status from reading_sessions")).rows[0]
      .status,
  ).toBe("scheduled");
  await db.query(
    "update reading_sessions set status='cancelled', cancellation_source='individual'",
  );
  await db.query("select * from manage_schedule(deleting => true)");
  await db.query(
    "select * from manage_schedule($1::uuid[], current_date, '20:00', 'America/Chicago', 'after')",
    [[rid]],
  );
  expect(
    (await db.query<{ status: string }>("select status from reading_sessions")).rows[0]
      .status,
  ).toBe("cancelled");
});

it("increments calendar revisions atomically even when restoring identical session details", async () => {
  const session = (
    await db.query<{ id: string }>(
      "insert into reading_sessions(family_id,scheduled_for,status,ics_uid) values ($1,current_date,'scheduled','revision-test') returning id",
      [fid],
    )
  ).rows[0];
  for (const [status, sequence] of [
    ["cancelled", 1],
    ["scheduled", 2],
    ["scheduled", 3],
  ] as const) {
    const result = await db.query<{ calendar_sequence: number }>(
      "update reading_sessions set status = $2, calendar_sequence = 0 where id = $1 returning calendar_sequence",
      [session.id, status],
    );
    expect(result.rows[0].calendar_sequence).toBe(sequence);
  }
});

it("persists schedule book settings and rejects invalid counts", async () => {
  await db.query("select set_config('test.uid', $1, false)", [owner]);
  await db.query(
    "select * from manage_schedule($1::uuid[], current_date, '19:30', 'UTC', 'after', false, 3, true)",
    [[mid]],
  );
  const settings = (
    await db.query(
      "select books_per_session, assign_random_books from schedules where active",
    )
  ).rows[0];
  expect(settings).toMatchObject({ books_per_session: 3, assign_random_books: true });
  await expect(
    db.query(
      "select * from manage_schedule($1::uuid[], current_date, '19:30', 'UTC', 'after', false, 0, true)",
      [[mid]],
    ),
  ).rejects.toThrow(/book settings/);
});

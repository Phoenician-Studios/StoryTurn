import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as store from "@/lib/demo/store";

afterEach(() => vi.useRealTimers());
beforeEach(() => {
  store.resetDemoStore();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
});

it("edits the existing schedule without duplicate nights or losing history", () => {
  const state = store.getDemoState();
  const schedule = state.schedules.find((s) => s.active)!;
  const past = state.sessions
    .filter((s) => s.status === "completed")
    .map((s) => ({ ...s }));
  store.saveSchedule({
    ...schedule,
    startDate: "2026-10-04",
    timeLocal: "20:00",
    readerRotationMemberIds: ["mem_jordan"],
  });
  expect(state.schedules.filter((s) => s.active)).toHaveLength(1);
  expect(state.schedules.find((s) => s.active)?.id).toBe(schedule.id);
  const future = state.sessions.filter(
    (s) => s.status === "scheduled" && s.scheduledFor >= "2026-10-04",
  );
  expect(new Set(future.map((s) => s.scheduledFor.slice(0, 10))).size).toBe(
    future.length,
  );
  expect(future.every((s) => s.scheduledFor.includes("T20:00"))).toBe(true);
  expect(
    past.every(
      (s) =>
        JSON.stringify(state.sessions.find((x) => x.id === s.id)) === JSON.stringify(s),
    ),
  ).toBe(true);
  for (const s of future)
    expect(
      state.assignments
        .filter((a) => a.sessionId === s.id && a.isCurrent)
        .map((a) => a.memberId),
    ).toEqual(["mem_jordan"]);
});
it("deletes a schedule by stopping generation and cancelling only its future nights", async () => {
  const state = store.getDemoState();
  const past = state.sessions
    .filter((s) => s.status === "completed")
    .map((s) => ({ ...s }));
  await store.deleteSchedule();
  expect(state.schedules.some((s) => s.active)).toBe(false);
  expect(store.ensureUpcomingSessions()).toBe(0);
  expect(
    state.sessions.some(
      (s) => s.status === "scheduled" && s.scheduledFor >= "2026-10-04",
    ),
  ).toBe(false);
  expect(
    past.every((s) => state.sessions.find((x) => x.id === s.id)?.status === s.status),
  ).toBe(true);
});
it("rejects readers and foreign rotation members before changing state", async () => {
  store.demoLogin("jordan@example.com");
  await expect(store.deleteSchedule()).rejects.toThrow(/owner/i);
  expect(() => store.createInviteCode("owner")).toThrow(/owner/i);
  store.demoLogin("alex@example.com");
  const schedule = store.getDemoState().schedules[0];
  expect(() =>
    store.saveSchedule({ ...schedule, readerRotationMemberIds: ["foreign"] }),
  ).toThrow(/reader/i);
});
it("adds a parent with a parent invite and allows editing their name and role", () => {
  const code = store.createInviteCode("owner");
  store.demoLogin("parent@example.com");
  store.joinFamily(code);
  const parent = store.getCurrentMember()!;
  expect(parent.role).toBe("owner");
  store.updateMember(parent.id, "New parent", "reader");
  expect(parent.displayName).toBe("New parent");
  expect(parent.role).toBe("reader");
});
it("protects the last parent and scopes member and child edits to the family", () => {
  expect(() => store.updateMember("mem_alex", "Alex", "reader")).toThrow(/last/i);
  expect(() => store.updateMember("foreign", "Name", "reader")).toThrow(/found/i);
  const kid = store.getDemoState().kids[0];
  store.updateKid(kid.id, "Sam", 7);
  expect(kid.name).toBe("Sam");
  store.deleteKid(kid.id);
  expect(store.getDemoState().kids.find((k) => k.id === kid.id)).toBeUndefined();
  expect(() => store.updateKid("foreign", "Sam", 7)).toThrow(/found/i);
});

it("can create a schedule again after deleting it without duplicate nights", async () => {
  const schedule = { ...store.getDemoState().schedules[0] };
  await store.deleteSchedule();
  store.saveSchedule({ ...schedule, startDate: "2026-10-04", timeLocal: "21:00" });
  expect(store.getHomeContext().nextSession).not.toBeNull();
  const upcoming = store
    .getDemoState()
    .sessions.filter((s) => s.status === "scheduled" && s.scheduledFor >= "2026-10-04");
  expect(new Set(upcoming.map((s) => s.icsUid)).size).toBe(upcoming.length);
  const all = store.getDemoState().sessions;
  expect(new Set(all.map((s) => s.icsUid)).size).toBe(all.length);
});

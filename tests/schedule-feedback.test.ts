import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as store from "@/lib/demo/store";
import { sendSessionInviteEmail } from "@/lib/session-mail";
vi.mock("@/lib/session-mail", () => ({
  sendSessionInviteEmail: vi.fn(async () => null),
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
  store.resetDemoStore();
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());
it("cancels the former reader's invite and requests the new reader's invite", () => {
  const state = store.getDemoState();
  const schedule = state.schedules[0];
  const night = state.sessions.find(
    (s) =>
      s.status === "scheduled" &&
      state.assignments.some(
        (a) => a.sessionId === s.id && a.isCurrent && a.memberId === "mem_alex",
      ),
  )!;
  const originalTime = night.scheduledFor;
  store.saveSchedule({
    ...schedule,
    readerRotationMemberIds: ["mem_jordan"],
    timeLocal: "20:30",
  });
  expect(
    vi
      .mocked(sendSessionInviteEmail)
      .mock.calls.some(
        ([input]) =>
          input.icsUid === night.icsUid &&
          input.method === "CANCEL" &&
          input.scheduledFor === originalTime &&
          input.attendees.some((a) => a.email === "alex@example.com"),
      ),
  ).toBe(true);
  expect(
    vi
      .mocked(sendSessionInviteEmail)
      .mock.calls.some(
        ([input]) =>
          input.icsUid === night.icsUid &&
          input.method === "REQUEST" &&
          input.attendees.some((a) => a.email === "jordan@example.com"),
      ),
  ).toBe(true);
});
it("restores only schedule-cancelled nights when a start date moves back", async () => {
  const state = store.getDemoState();
  const schedule = { ...state.schedules[0] };
  const night = state.sessions.find(
    (s) => s.status === "scheduled" && s.scheduledFor.startsWith("2026-10-04"),
  )!;
  store.saveSchedule({ ...schedule, startDate: "2026-10-06" });
  expect(night.status).toBe("cancelled");
  store.saveSchedule({ ...schedule, startDate: "2026-10-04" });
  expect(night.status).toBe("scheduled");
  await store.cancelSession(night.id);
  await store.deleteSchedule();
  store.saveSchedule({ ...schedule, startDate: "2026-10-04" });
  expect(night.status).toBe("cancelled");
});
it("generates, edits, and deletes tonight using the schedule-local date", async () => {
  vi.setSystemTime(new Date("2026-10-05T02:00:00Z"));
  const state = store.getDemoState();
  const schedule = state.schedules[0];
  schedule.timezone = "America/Los_Angeles";
  schedule.startDate = "2026-10-04";
  state.sessions = [];
  state.assignments = [];
  store.ensureUpcomingSessions(1);
  expect(state.sessions.map((s) => s.scheduledFor.slice(0, 10))).toEqual([
    "2026-10-04",
    "2026-10-05",
  ]);
  const tonight = state.sessions[0];
  store.saveSchedule({ ...schedule, timeLocal: "20:30" });
  expect(tonight.scheduledFor).toBe("2026-10-04T20:30:00");
  await store.deleteSchedule();
  expect(tonight.status).toBe("cancelled");
});

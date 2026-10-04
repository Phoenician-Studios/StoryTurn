import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as store from "@/lib/demo/store";
vi.mock("@/app/actions", () => ({
  saveScheduleAction: vi.fn(),
  deleteScheduleAction: vi.fn(),
}));
vi.mock("@/components/app-nav", () => ({ AppNav: () => null }));
vi.mock("@/lib/data", () => ({
  getCurrentUser: store.getCurrentUser,
  getCurrentMember: store.getCurrentMember,
  getFamilyAdmin: store.getFamilyAdmin,
  getFamilySessionPage: store.getFamilySessionPage,
  getHomeContext: store.getHomeContext,
}));
import SchedulePage from "@/app/schedule/page";
import HomePage from "@/app/page";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-05T02:00:00Z"));
  store.resetDemoStore();
});
afterEach(() => vi.useRealTimers());
it("renders no more than ten sessions and links to later pages", async () => {
  const first = renderToStaticMarkup(
    await SchedulePage({ searchParams: Promise.resolve({ page: "1" }) }),
  );
  const second = renderToStaticMarkup(
    await SchedulePage({ searchParams: Promise.resolve({ page: "2" }) }),
  );
  expect((first.match(/href="\/sessions\//g) ?? []).length).toBe(10);
  expect((second.match(/href="\/sessions\//g) ?? []).length).toBe(10);
  expect(first).toContain("/schedule?page=2");
  expect(second).toContain("/schedule?page=1");
  const id = store.listFamilySessions()[0].id;
  expect(first).toContain(`/sessions/${id}`);
  expect(second).not.toContain(`/sessions/${id}`);
});
it("shows Tonight on home using local midnight and Tomorrow for the next calendar night", async () => {
  const state = store.getDemoState();
  const schedule = state.schedules[0];
  schedule.timezone = "America/Chicago";
  const today = state.sessions.find((s) => s.status === "scheduled")!;
  state.sessions = [today];
  today.scheduledFor = "2026-10-04T19:30:00";
  state.assignments = [
    {
      id: "a",
      sessionId: today.id,
      memberId: "mem_alex",
      isCurrent: true,
      isOriginal: true,
      createdAt: "",
    },
  ];
  expect(renderToStaticMarkup(await HomePage())).toContain("Tonight at");
  today.scheduledFor = "2026-10-05T19:30:00";
  expect(renderToStaticMarkup(await HomePage())).toContain("Tomorrow at");
});

it("shows the final partial page and an empty list without invalid navigation", async () => {
  const last = renderToStaticMarkup(
    await SchedulePage({ searchParams: Promise.resolve({ page: "99" }) }),
  );
  expect((last.match(/href="\/sessions\//g) ?? []).length).toBe(5);
  expect(last).toContain("Page 3 of 3");
  expect(last).not.toContain("/schedule?page=4");
  store.getDemoState().sessions = [];
  const empty = renderToStaticMarkup(
    await SchedulePage({ searchParams: Promise.resolve({}) }),
  );
  expect(empty).toContain("No reading sessions yet.");
  expect(empty).not.toContain('aria-label="Session pages"');
});

it("can reach sessions after the thousandth row through the schedule page", async () => {
  const state = store.getDemoState();
  const template = { ...state.sessions[0] };
  state.sessions = Array.from({ length: 1005 }, (_, i) => ({
    ...template,
    id: `night-${i}`,
    scheduledFor: new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString(),
  }));
  state.assignments = [
    {
      id: "oldest",
      sessionId: "night-0",
      memberId: "mem_jordan",
      isCurrent: true,
      isOriginal: true,
      createdAt: "",
    },
  ];
  const html = renderToStaticMarkup(
    await SchedulePage({ searchParams: Promise.resolve({ page: "101" }) }),
  );
  expect(html).toContain("Page 101 of 101");
  expect(html).toContain("1005 sessions");
  expect(html).toContain("/sessions/night-0");
  expect(html).toContain("Jordan");
  expect((html.match(/href="\/sessions\//g) ?? []).length).toBe(5);
});
it("generates tonight before rendering its local-date label", async () => {
  const state = store.getDemoState();
  state.sessions = [];
  state.assignments = [];
  Object.assign(state.schedules[0], {
    timezone: "America/Chicago",
    startDate: "2026-10-04",
    readerRotationMemberIds: ["mem_alex"],
  });
  store.ensureUpcomingSessions(1);
  expect(renderToStaticMarkup(await HomePage())).toContain("Tonight at");
});

it("renders numbered links, ellipses, and exactly one current page", async () => {
  const state = store.getDemoState();
  const template = { ...state.sessions[0] };
  state.sessions = Array.from({ length: 1005 }, (_, i) => ({
    ...template,
    id: `pagination-${i}`,
    scheduledFor: new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString(),
  }));
  const html = renderToStaticMarkup(
    await SchedulePage({ searchParams: Promise.resolve({ page: "50" }) }),
  );
  const nav = html.match(/<nav aria-label="Session pages"[\s\S]*?<\/nav>/)?.[0];
  expect(nav).toBeDefined();
  const links = [...nav!.matchAll(/<a\b([^>]*)>(\d+)<\/a>/g)];
  expect(links.map((match) => Number(match[2]))).toEqual([1, 49, 50, 51, 101]);
  for (const [, attributes, label] of links) {
    expect(attributes).toContain(`href="/schedule?page=${label}"`);
    expect(attributes).toContain(`aria-label="Page ${label}"`);
    expect(attributes.includes('aria-current="page"')).toBe(label === "50");
  }
  expect((nav!.match(/aria-current="page"/g) ?? []).length).toBe(1);
  expect((nav!.match(/aria-hidden="true">…<\/span>/g) ?? []).length).toBe(2);
  expect(nav).not.toContain("Previous");
  expect(nav).not.toContain(">Next<");
});

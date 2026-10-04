import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import * as store from "@/lib/demo/store";
vi.mock("@/app/actions", () => ({
  saveScheduleAction: vi.fn(),
  deleteScheduleAction: vi.fn(),
  addKidAction: vi.fn(),
  createInviteAction: vi.fn(),
  updateMemberAction: vi.fn(),
  updateKidAction: vi.fn(),
  deleteKidAction: vi.fn(),
}));
vi.mock("@/components/app-nav", () => ({ AppNav: () => null }));
vi.mock("@/lib/data", () => ({
  getCurrentUser: store.getCurrentUser,
  getCurrentMember: store.getCurrentMember,
  getFamilyAdmin: store.getFamilyAdmin,
  getFamilySessionPage: store.getFamilySessionPage,
}));
import SchedulePage from "@/app/schedule/page";
import FamilyPage from "@/app/family/page";
beforeEach(() => store.resetDemoStore());
it("offers parent schedule editing and deletion", async () => {
  const html = renderToStaticMarkup(
    await SchedulePage({ searchParams: Promise.resolve({}) }),
  );
  expect(html).toContain("Edit rotation");
  expect(html).toContain("Delete schedule");
});
it("offers parent invitations, reader editing, and child editing/removal", async () => {
  const html = renderToStaticMarkup(await FamilyPage());
  expect(html).toContain("Parent (can manage family)");
  expect(html).toContain("Save reader");
  expect(html).toContain("Save child");
  expect(html).toContain("Remove child");
});
it("hides management forms from readers", async () => {
  store.demoLogin("jordan@example.com");
  const family = renderToStaticMarkup(await FamilyPage());
  const schedule = renderToStaticMarkup(
    await SchedulePage({ searchParams: Promise.resolve({}) }),
  );
  expect(family).not.toContain("Save reader");
  expect(family).not.toContain("Remove child");
  expect(schedule).not.toContain("Delete schedule");
});

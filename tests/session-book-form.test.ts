// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as store from "@/lib/demo/store";
import SessionPage from "@/app/sessions/[id]/page";
vi.mock("@/components/app-nav", () => ({ AppNav: () => null }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/session-mail", () => ({
  sendSessionInviteEmail: vi.fn(async () => null),
}));
beforeEach(() => {
  vi.stubEnv("FORCE_DEMO_MODE", "1");
  store.resetDemoStore();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
it("submits retained planned books through the actual session form and server action", async () => {
  const night = store.getHomeContext().nextSession!;
  await store.updateSession({
    sessionId: night.id,
    memberIds: ["mem_alex"],
    bookIds: ["book_moon"],
    freeformTitles: ["Planned story"],
    notes: null,
    status: "scheduled",
  });
  render(await SessionPage({ params: Promise.resolve({ id: night.id }) }));
  const user = userEvent.setup();
  await user.click(screen.getByText(/Books from library ·/));
  expect(
    (screen.getByRole("checkbox", { name: "Goodnight Moon" }) as HTMLInputElement)
      .checked,
  ).toBe(true);
  await user.click(screen.getByRole("checkbox", { name: "The Very Hungry Caterpillar" }));
  await user.click(screen.getByText(/Books from library ·/));
  await user.type(
    screen.getByLabelText("Other book titles (one per line)"),
    "\nOne more story",
  );
  await user.selectOptions(screen.getByLabelText("Status"), "completed");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(store.getSessionDetail(night.id)?.session.status).toBe("completed"),
  );
  expect(
    store.getSessionDetail(night.id)?.books.map((b) => b.titleFreeform ?? b.bookId),
  ).toEqual(["book_moon", "book_hungry", "Planned story", "One more story"]);
});

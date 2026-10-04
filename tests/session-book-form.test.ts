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
  await user.click(screen.getByRole("button", { name: "Add books from library" }));
  expect(
    (
      (await screen.findByRole("button", {
        name: "Goodnight Moon",
      })) as HTMLInputElement
    ).getAttribute("aria-pressed"),
  ).toBe("true");
  await user.click(
    await screen.findByRole("button", { name: "The Very Hungry Caterpillar" }),
  );
  await user.click(screen.getByRole("button", { name: /Done ·/ }));
  await user.type(
    screen.getByLabelText("Other book titles (one per line)"),
    "\nOne more story",
  );
  await user.click(screen.getByLabelText("Status"));
  await user.click(await screen.findByRole("option", { name: "Completed" }));
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(store.getSessionDetail(night.id)?.session.status).toBe("completed"),
  );
  expect(
    store.getSessionDetail(night.id)?.books.map((b) => b.titleFreeform ?? b.bookId),
  ).toEqual(["book_moon", "book_hungry", "Planned story", "One more story"]);
});

it("removes an initially selected book when saved with the modal closed", async () => {
  const night = store.getHomeContext().nextSession!;
  await store.updateSession({
    sessionId: night.id,
    memberIds: ["mem_alex"],
    bookIds: ["book_moon", "book_hungry"],
    freeformTitles: ["Planned story"],
    notes: null,
    status: "scheduled",
  });
  const view = render(await SessionPage({ params: Promise.resolve({ id: night.id }) }));
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add books from library" }));
  const moon = (await screen.findByRole("button", {
    name: "Goodnight Moon",
  })) as HTMLInputElement;
  expect(moon.getAttribute("aria-pressed")).toBe("true");
  await user.click(moon);
  expect(moon.getAttribute("aria-pressed")).toBe("false");
  await user.click(screen.getByRole("button", { name: /Done ·/ }));
  expect(screen.queryByRole("dialog")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(
      store.getSessionDetail(night.id)?.books.map((b) => b.titleFreeform ?? b.bookId),
    ).toEqual(["book_hungry", "Planned story"]),
  );

  view.unmount();
  render(await SessionPage({ params: Promise.resolve({ id: night.id }) }));
  await user.click(screen.getByRole("button", { name: "Add books from library" }));
  expect(
    (
      (await screen.findByRole("button", {
        name: "Goodnight Moon",
      })) as HTMLInputElement
    ).getAttribute("aria-pressed"),
  ).toBe("false");
  expect(
    (
      screen.getByRole("button", {
        name: "The Very Hungry Caterpillar",
      }) as HTMLInputElement
    ).getAttribute("aria-pressed"),
  ).toBe("true");
});

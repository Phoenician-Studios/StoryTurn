// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AppNav } from "@/components/app-nav";

vi.mock("@/app/actions", () => ({ logoutAction: vi.fn() }));
afterEach(cleanup);

it("toggles mobile navigation and restores focus when Escape closes it", async () => {
  const user = userEvent.setup();
  render(createElement(AppNav, { displayName: "Alex" }));
  const toggle = screen.getByRole("button", { name: "Open navigation" });
  const panel = document.getElementById(toggle.getAttribute("aria-controls")!)!;
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(panel.hasAttribute("inert")).toBe(true);
  expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).toBeNull();

  await user.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(panel.hasAttribute("inert")).toBe(false);
  const mobileNav = screen.getByRole("navigation", { name: "Mobile navigation" });
  const links = within(mobileNav).getAllByRole("link");
  expect(links.map((link) => link.textContent)).toEqual([
    "Tonight",
    "Dashboard",
    "Library",
    "Schedule",
    "Family",
  ]);
  links[0].focus();
  await user.keyboard("{Escape}");
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(toggle);

  await user.click(toggle);
  await user.click(toggle);
  expect(panel.hasAttribute("inert")).toBe(true);
});

it("closes the mobile panel after selecting a destination", async () => {
  const user = userEvent.setup();
  render(createElement(AppNav, { displayName: "Alex" }));
  await user.click(screen.getByRole("button", { name: "Open navigation" }));
  const mobileNav = screen.getByRole("navigation", { name: "Mobile navigation" });
  await user.click(within(mobileNav).getByRole("link", { name: "Tonight" }));
  expect(
    screen.getByRole("button", { name: "Open navigation" }).getAttribute("aria-expanded"),
  ).toBe("false");
});

// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TimezonePicker } from "@/components/timezone-picker";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("detects a timezone for a new schedule and submits a valid zone", () => {
  render(createElement(TimezonePicker));
  const select = screen.getByRole("combobox", { name: "Timezone" }) as HTMLSelectElement;
  expect(select.value).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  expect(select.name).toBe("timezone");
  expect(screen.getByRole("button", { name: /use my timezone/i })).toBeDefined();
});
it("keeps the saved timezone and allows searching by familiar names", () => {
  render(createElement(TimezonePicker, { defaultValue: "America/Chicago" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Central" } });
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
    "America/Chicago",
  );
  expect(screen.getByRole("option", { name: /Chicago/ }).textContent).toContain(
    "Central",
  );
});
it("supports cities worldwide, fractional offsets, and changing the selection", () => {
  render(createElement(TimezonePicker, { defaultValue: "UTC" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Kathmandu" } });
  const option = screen.getByRole("option", {
    name: /Kathmandu|Katmandu/,
  }) as HTMLOptionElement;
  fireEvent.change(screen.getByRole("combobox"), { target: { value: option.value } });
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(option.value);
  expect(screen.queryByRole("option", { name: /Los Angeles/ })).toBeNull();
});

it("server-renders a usable timezone for new schedules before JavaScript runs", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = renderToStaticMarkup(createElement(TimezonePicker));
  const container = document.createElement("div");
  container.innerHTML = html;
  const select = container.querySelector("select")!;
  expect(select.value).toBe("UTC");
  expect(select.checkValidity()).toBe(true);
  expect(select.selectedOptions[0].disabled).toBe(false);
});

// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { NativeTimezoneForm } from "@/components/native-timezone-form";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it.each(["America/Chicago", "Asia/Kathmandu", "Pacific/Auckland"])(
  "submits the browser timezone %s without offering a selection",
  async (timezone) => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: timezone,
    } as Intl.ResolvedDateTimeFormatOptions);
    const action = vi.fn<(data: FormData) => Promise<void>>(async () => {});
    render(
      createElement(
        NativeTimezoneForm,
        { action },
        createElement("button", { type: "submit" }, "Save schedule"),
      ),
    );
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("searchbox")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Save schedule" }));
    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(action.mock.calls[0][0].get("timezone")).toBe(timezone);
  },
);
it("prevents saving a server timezone before browser detection", () => {
  const html = renderToStaticMarkup(
    createElement(
      NativeTimezoneForm,
      { action: async () => {} },
      createElement("button", { type: "submit" }, "Save schedule"),
    ),
  );
  const container = document.createElement("div");
  container.innerHTML = html;
  expect(container.querySelector("fieldset")?.disabled).toBe(true);
  expect(container.querySelector<HTMLInputElement>('input[name="timezone"]')?.value).toBe(
    "",
  );
});

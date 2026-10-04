// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { FormSelect } from "@/components/form-select";

afterEach(cleanup);

it("shows role labels and submits the selected value after keyboard selection", async () => {
  const user = userEvent.setup();
  const { container } = render(
    createElement(
      "form",
      null,
      createElement(FormSelect, {
        name: "role",
        defaultValue: "reader",
        "aria-label": "Invite as",
        options: [
          { value: "reader", label: "Reader" },
          { value: "owner", label: "Parent (can manage family)" },
        ],
      }),
    ),
  );
  const form = container.querySelector("form")!;
  expect(new FormData(form).get("role")).toBe("reader");
  const trigger = screen.getByRole("combobox", { name: "Invite as" });
  expect(trigger.textContent).toContain("Reader");
  trigger.focus();
  await user.keyboard("{ArrowDown}");
  await screen.findByRole("option", { name: "Parent (can manage family)" });
  await user.keyboard("{End}{Enter}");
  expect(trigger.textContent).toContain("Parent (can manage family)");
  expect(new FormData(form).get("role")).toBe("owner");
});

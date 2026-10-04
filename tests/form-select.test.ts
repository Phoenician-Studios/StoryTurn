// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act } from "@testing-library/react";
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

it("offers native choices before hydration and preserves a pre-hydration selection", async () => {
  const element = createElement(
    "form",
    null,
    createElement(FormSelect, {
      name: "role",
      defaultValue: "reader",
      "aria-label": "Invite as",
      options: [
        { value: "reader", label: "Reader" },
        { value: "owner", label: "Parent" },
      ],
    }),
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.innerHTML = renderToString(element);
  const native = container.querySelector("select")!;
  expect([...native.options].map((option) => option.value)).toEqual(["reader", "owner"]);
  native.value = "owner";
  expect(new FormData(container.querySelector("form")!).get("role")).toBe("owner");
  let root!: ReturnType<typeof hydrateRoot>;
  try {
    await act(async () => {
      root = hydrateRoot(container, element);
    });
    expect(container.querySelector("select")).toBeNull();
    expect(container.querySelector('[role="combobox"]')?.textContent).toContain("Parent");
    expect(new FormData(container.querySelector("form")!).get("role")).toBe("owner");
  } finally {
    if (root) await act(async () => root.unmount());
    container.remove();
  }
});

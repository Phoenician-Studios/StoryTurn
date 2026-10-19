import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SessionStatusBadge } from "@/components/session-status";

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount((value) => value + 1)}>
      Clicked {count} times
    </button>
  );
}

describe("tsx test setup", () => {
  it("runs in jsdom", () => {
    expect(typeof window).toBe("object");
    expect(document.body).toBeInstanceOf(HTMLElement);
  });

  it("renders an app component through the @ alias with JSX", () => {
    render(<SessionStatusBadge status="cancelled" className="extra" />);

    const badge = screen.getByText("Canceled");
    expect(badge).toBeInTheDocument();
    expect(badge).toBeVisible();
    expect(badge).toHaveClass("extra");
  });

  it("supports user interaction with stateful components", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const button = screen.getByRole("button", { name: "Clicked 0 times" });
    await user.click(button);
    await user.click(button);

    expect(button).toHaveTextContent("Clicked 2 times");
  });

  it("cleans up the DOM rendered by earlier tests", () => {
    expect(document.body).toBeEmptyDOMElement();
    expect(screen.queryByText("Canceled")).not.toBeInTheDocument();
  });
});

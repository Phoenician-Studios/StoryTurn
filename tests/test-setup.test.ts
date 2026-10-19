import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("ts test setup", () => {
  it("runs in node without a DOM", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("resolves the @ alias", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("registers jest-dom matchers", () => {
    expect(() => expect(null).not.toBeInTheDocument()).not.toThrow();
  });
});

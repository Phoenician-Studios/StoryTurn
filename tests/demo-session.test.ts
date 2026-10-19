import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDemoSessionUserId, resetDemoStore } from "@/lib/demo/store";

describe("demo session defaults", () => {
  beforeEach(() => {
    // Simulate a fresh process with no session assigned yet.
    const globalForDemo = globalThis as unknown as {
      __storyTurnSessionUserId?: string | null;
      __storyTurnState?: unknown;
    };
    delete globalForDemo.__storyTurnSessionUserId;
    delete globalForDemo.__storyTurnState;
  });

  afterEach(() => {
    resetDemoStore();
    vi.unstubAllGlobals();
  });

  it("does not auto-sign-in as Alex when no session has been set", async () => {
    const { getDemoSessionUserId: readSession } = await import(
      "@/lib/demo/store"
    );
    expect(readSession()).toBeNull();
  });

  it("resetDemoStore still signs in Alex for unit tests", () => {
    resetDemoStore();
    expect(getDemoSessionUserId()).toBe("user_alex");
  });
});

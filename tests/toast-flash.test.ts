import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearToastFlash,
  consumeToastFlash,
  queueToastFlash,
} from "@/lib/toast-flash";

describe("toast flash storage", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    });
  });

  afterEach(() => {
    clearToastFlash();
    vi.unstubAllGlobals();
  });

  it("queues and consumes a success flash once", () => {
    queueToastFlash({
      type: "success",
      title: "Kid added",
      description: "Mia",
    });

    expect(consumeToastFlash()).toEqual({
      type: "success",
      title: "Kid added",
      description: "Mia",
    });
    expect(consumeToastFlash()).toBeNull();
  });

  it("clears a queued flash without showing it", () => {
    queueToastFlash({ type: "error", title: "Nope" });
    clearToastFlash();
    expect(consumeToastFlash()).toBeNull();
  });
});

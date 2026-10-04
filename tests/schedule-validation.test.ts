import { expect, it } from "vitest";
import { resetDemoStore, saveSchedule, getDemoState } from "@/lib/demo/store";
it("rejects invalid timezone, dates, and times before changing a schedule", () => {
  resetDemoStore();
  const schedule = { ...getDemoState().schedules[0] };
  for (const override of [
    { timezone: "not-a-zone" },
    { startDate: "2026-02-30" },
    { timeLocal: "25:00" },
  ]) {
    expect(() => saveSchedule({ ...schedule, ...override })).toThrow();
    expect(getDemoState().schedules[0]).toEqual(schedule);
  }
});

import { describe, expect, it } from "vitest";
import { applyReassignment } from "@/lib/domain/corrections";
import {
  mapSchedule,
  partitionAssignmentWrites,
  toTimeHm,
  toWallClock,
} from "@/lib/supabase/map";

const alexId = "11111111-1111-4111-8111-111111111111";
const jordanId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";

describe("supabase mappers", () => {
  it("keeps wall-clock time when Postgres returns an offset", () => {
    expect(toWallClock("2026-10-04T19:30:00+00:00")).toBe("2026-10-04T19:30:00");
    expect(toWallClock("2026-10-04T19:30:00.000Z")).toBe("2026-10-04T19:30:00");
    expect(toTimeHm("19:30:00")).toBe("19:30");
  });

  it("maps schedule time and rotation ids", () => {
    const schedule = mapSchedule({
      id: "44444444-4444-4444-8444-444444444444",
      family_id: "55555555-5555-4555-8555-555555555555",
      mode: "together",
      reader_rotation_member_ids: [alexId, jordanId],
      start_date: "2026-10-01",
      time_local: "19:30:00",
      timezone: "America/Los_Angeles",
      book_timing: "after",
      active: true,
      created_at: "2026-10-01T00:00:00Z",
    });
    expect(schedule.timeLocal).toBe("19:30");
    expect(schedule.readerRotationMemberIds).toEqual([alexId, jordanId]);
  });

  it("keeps original assignment ids and inserts the replacement reader", () => {
    const next = applyReassignment({
      existing: [
        {
          id: alexId,
          sessionId,
          memberId: alexId,
          isOriginal: true,
          isCurrent: true,
          createdAt: "2026-10-01T00:00:00Z",
        },
      ],
      sessionId,
      newMemberIds: [jordanId],
      nowIso: "2026-10-04T00:00:00Z",
    });
    const parts = partitionAssignmentWrites(next.filter((row) => row.sessionId === sessionId));
    expect(parts.updates).toEqual([
      expect.objectContaining({ id: alexId, isOriginal: true, isCurrent: false }),
    ]);
    expect(parts.inserts).toEqual([
      expect.objectContaining({
        memberId: jordanId,
        isOriginal: false,
        isCurrent: true,
      }),
    ]);
  });
});

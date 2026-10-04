import { expect, it, vi } from "vitest";
import { sendSessionInviteEmail } from "@/lib/session-mail";
vi.mock("@/lib/plunk", () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));
it("sends the persisted revision for both requests and cancellations", async () => {
  for (const method of ["REQUEST", "CANCEL"] as const) {
    const sent = await sendSessionInviteEmail({
      familyName: "Family",
      scheduledFor: "2026-10-04T19:30:00",
      icsUid: "same-night",
      sequence: 7,
      attendees: [{ email: "reader@example.com", displayName: "Reader" }],
      method,
    });
    expect(sent?.ics).toContain("SEQUENCE:7");
    expect(sent?.ics).toContain(`METHOD:${method}`);
  }
});

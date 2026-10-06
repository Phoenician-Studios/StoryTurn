import { describe, expect, it } from "vitest";
import { buildReadingInviteIcs, readingInviteSubject } from "@/lib/ics";

describe("buildReadingInviteIcs", () => {
  it("creates a VEVENT with UID and attendees", () => {
    const ics = buildReadingInviteIcs({
      uid: "storyturn-fam-2026-10-04@bedtime-readers.app",
      title: "Bedtime reading · The Riveras",
      description: "Reading night",
      startLocal: "2026-10-04T19:30:00",
      organizerEmail: "alex@example.com",
      organizerName: "The Riveras",
      attendeeEmails: ["alex@example.com", "jordan@example.com"],
    });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:storyturn-fam-2026-10-04@bedtime-readers.app");
    expect(ics).toContain("SUMMARY:Bedtime reading");
    expect(ics).toMatch(/ATTENDEE/);
    expect(ics).toContain("METHOD:REQUEST");
  });

  it("marks cancellations", () => {
    const ics = buildReadingInviteIcs({
      uid: "storyturn-fam-2026-10-04@bedtime-readers.app",
      title: "Bedtime reading · The Riveras",
      description: "Cancelled",
      startLocal: "2026-10-04T19:30:00",
      organizerEmail: "alex@example.com",
      organizerName: "The Riveras",
      attendeeEmails: ["alex@example.com"],
      method: "CANCEL",
      sequence: 1,
    });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
  });
});

describe("readingInviteSubject", () => {
  it("labels cancel clearly", () => {
    expect(
      readingInviteSubject({
        familyName: "The Riveras",
        dateLabel: "2026-10-04",
        cancelled: true,
      }),
    ).toMatch(/^Canceled:/);
  });
});

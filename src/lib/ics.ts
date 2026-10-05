import { createEvent, type EventAttributes } from "ics";

export type IcsMethod = "REQUEST" | "CANCEL";

export interface ReadingInviteInput {
  uid: string;
  title: string;
  description: string;
  startLocal: string; // YYYY-MM-DDTHH:mm:00
  durationMinutes?: number;
  organizerEmail: string;
  organizerName: string;
  attendeeEmails: string[];
  method?: IcsMethod;
  sequence?: number;
}

function parseLocalParts(startLocal: string): [number, number, number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(startLocal);
  if (!match) {
    throw new Error(`Invalid startLocal: ${startLocal}`);
  }
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  ];
}

/** Build a VCALENDAR string for a bedtime reading invite. */
export function buildReadingInviteIcs(input: ReadingInviteInput): string {
  const start = parseLocalParts(input.startLocal);
  const method = input.method ?? "REQUEST";
  const durationMinutes = input.durationMinutes ?? 30;

  const event: EventAttributes = {
    uid: input.uid,
    start,
    startInputType: "local",
    duration: { minutes: durationMinutes },
    title: input.title,
    description: input.description,
    status: method === "CANCEL" ? "CANCELLED" : "CONFIRMED",
    busyStatus: "BUSY",
    productId: "bedtime-readers/ics",
    sequence: input.sequence ?? (method === "CANCEL" ? 1 : 0),
    organizer: {
      name: input.organizerName,
      email: input.organizerEmail,
    },
    attendees: input.attendeeEmails.map((email) => ({
      name: email,
      email,
      rsvp: true,
      partstat: "NEEDS-ACTION",
      role: "REQ-PARTICIPANT",
    })),
    method,
  };

  const { error, value } = createEvent(event);
  if (error || !value) {
    throw error ?? new Error("Failed to create ICS");
  }

  // Ensure METHOD is present at VCALENDAR level for invite clients.
  if (!value.includes("METHOD:")) {
    return value.replace("BEGIN:VCALENDAR", `BEGIN:VCALENDAR\r\nMETHOD:${method}`);
  }
  return value;
}

export function readingInviteSubject(params: {
  familyName: string;
  dateLabel: string;
  cancelled?: boolean;
}): string {
  if (params.cancelled) {
    return `Canceled: Bedtime reading for ${params.familyName} on ${params.dateLabel}`;
  }
  return `Bedtime reading: ${params.familyName} on ${params.dateLabel}`;
}

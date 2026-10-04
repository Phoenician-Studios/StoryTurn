import { sessionDateKey } from "@/lib/domain/sessions";
import { buildReadingInviteIcs, readingInviteSubject } from "@/lib/ics";
import { sendEmail, type SendEmailResult } from "@/lib/plunk";

export async function sendSessionInviteEmail(input: {
  familyName: string;
  scheduledFor: string;
  icsUid: string;
  attendees: { email: string; displayName: string }[];
  method: "REQUEST" | "CANCEL";
}): Promise<{
  to: string[];
  subject: string;
  body: string;
  ics: string;
  result: SendEmailResult;
} | null> {
  const attendees = input.attendees.filter((member) => member.email);
  if (attendees.length === 0) return null;

  const dateLabel = sessionDateKey(input.scheduledFor);
  const ics = buildReadingInviteIcs({
    uid: input.icsUid,
    title: `Bedtime reading · ${input.familyName}`,
    description: `Reading to the kids for ${input.familyName}.`,
    startLocal: input.scheduledFor,
    organizerEmail: attendees[0]!.email,
    organizerName: input.familyName,
    attendeeEmails: attendees.map((member) => member.email),
    method: input.method,
    sequence: input.method === "CANCEL" ? 1 : 0,
  });

  const subject = readingInviteSubject({
    familyName: input.familyName,
    dateLabel,
    cancelled: input.method === "CANCEL",
  });
  const body =
    input.method === "CANCEL"
      ? `<p>This bedtime reading session on <strong>${dateLabel}</strong> was cancelled.</p>`
      : `<p>You're on for bedtime reading on <strong>${dateLabel}</strong>.</p><p>A calendar invite is attached.</p>`;

  const to = attendees.map((member) => member.email);
  const result = await sendEmail({ to, subject, body, icsContent: ics });
  return { to, subject, body, ics, result };
}

import { isPlunkConfigured } from "@/lib/config";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  body: string;
  icsContent?: string | null;
}

export interface SendEmailResult {
  ok: boolean;
  mode: "plunk" | "log";
  id?: string;
  error?: string;
}

/**
 * Send email via Plunk. When PLUNK_API_KEY is missing, logs and returns ok
 * so local/demo flows never hard-fail on email.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const to = Array.isArray(input.to) ? input.to : [input.to];

  if (!isPlunkConfigured()) {
    console.info("[plunk:demo]", {
      to,
      subject: input.subject,
      hasIcs: Boolean(input.icsContent),
    });
    return { ok: true, mode: "log", id: `log_${Date.now()}` };
  }

  try {
    const response = await fetch("https://api.useplunk.com/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PLUNK_API_KEY}`,
      },
      body: JSON.stringify({
        to,
        subject: input.subject,
        body: input.body,
        // Plunk supports attachments on some plans; include ICS inline as fallback body part.
        attachedFiles: input.icsContent
          ? [
              {
                filename: "invite.ics",
                content: Buffer.from(input.icsContent, "utf8").toString("base64"),
                contentType: "text/calendar; method=REQUEST; charset=UTF-8",
              },
            ]
          : undefined,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, mode: "plunk", error: text };
    }

    const data = (await response.json()) as { id?: string };
    return { ok: true, mode: "plunk", id: data.id };
  } catch (error) {
    return {
      ok: false,
      mode: "plunk",
      error: error instanceof Error ? error.message : "Unknown Plunk error",
    };
  }
}

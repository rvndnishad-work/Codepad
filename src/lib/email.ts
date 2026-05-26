/**
 * Minimal email adapter. Uses the Resend HTTP API when RESEND_API_KEY is set;
 * otherwise logs to the server console (dev mode). No npm dependency required.
 *
 * Intentionally fire-and-forget at call sites: a transport failure must never
 * break the user-facing action that triggered it (e.g. invite creation).
 */

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type EmailResult =
  | { sent: true; provider: "resend" | "console"; id?: string }
  | { sent: false; reason: string };

const FROM = process.env.EMAIL_FROM || "Interviewpad <noreply@interviewpad.in>";

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  if (!msg.to || !msg.subject) {
    return { sent: false, reason: "Missing to/subject" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev fallback — surface the link in server logs so localhost flow works
    // without configuring a transport.
    console.log(
      `[email:dev-stub] to=${msg.to} subject="${msg.subject}"\n${msg.text || stripHtml(msg.html)}`
    );
    return { sent: true, provider: "console" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { sent: false, reason: `Resend ${res.status}: ${errText.slice(0, 200)}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, provider: "resend", id: data.id };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : "fetch failed" };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

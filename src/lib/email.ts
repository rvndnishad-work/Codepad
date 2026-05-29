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

/**
 * Resolve the sender at call time (not module load) so env loaded after import
 * is honored. In Resend "test mode" — a real API key but no *verified* domain —
 * the only sender Resend accepts is `onboarding@resend.dev`, and it will only
 * deliver to your own Resend account email. So when EMAIL_FROM is unset we
 * default to that test sender outside production, and to the verified-domain
 * address in production.
 */
function resolveFrom(): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (process.env.NODE_ENV !== "production") {
    return "Interviewpad (dev) <onboarding@resend.dev>";
  }
  return "Interviewpad <noreply@interviewpad.in>";
}

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
        from: resolveFrom(),
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

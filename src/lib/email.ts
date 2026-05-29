/**
 * Transactional email service (IP-24).
 *
 * Single typed entry point: `sendEmail({ template, to, props, idempotencyKey? })`.
 * The template name picks the rendered component, its subject, and a text
 * fallback (see src/emails/index.ts). TypeScript enforces matching props.
 *
 * Behavior:
 *   - In production / when RESEND_API_KEY is set: POSTs to Resend HTTP API.
 *   - In dev / when the key is absent: logs a stub to the server console so
 *     localhost flows (invites, notifies, password reset) still complete.
 *   - Fire-and-forget at call sites: returns a normalized EmailResult; a
 *     transport failure must NEVER throw past the caller's user-facing action.
 *   - Idempotency-Key (Resend feature) is forwarded when provided so retries
 *     don't double-send. Callers in our cron / retry surfaces should hash a
 *     stable identifier (e.g. take-home id + scenario) into the key.
 *
 * Sender resolution:
 *   - EMAIL_FROM env wins.
 *   - Otherwise in dev → onboarding@resend.dev (Resend's test-mode requirement;
 *     only delivers to your Resend account email until you verify a domain).
 *   - Otherwise in prod → noreply on the production domain.
 */
import { render } from "@react-email/render";
import * as React from "react";
import { TEMPLATES, type TemplateName, type TemplateProps } from "@/emails";
import { prisma } from "@/lib/prisma";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendEmailInput<T extends TemplateName> = {
  template: T;
  to: string | string[];
  props: TemplateProps[T];
  /** Optional Resend idempotency token. Same key + same body = de-duped server-side. */
  idempotencyKey?: string;
  /** Reply-To header (recruiter notify wants the recruiter's reply to come back to ops). */
  replyTo?: string;
  /** Optional workspace context — persisted on the EmailLog row for filtering. */
  workspaceId?: string;
  /** Optional session id (interview / take-home / generic) for traceability. */
  sessionId?: string;
};

function normalizeAddress(addr: string): string {
  return addr.trim().toLowerCase();
}

/**
 * Check whether ANY recipient is on the suppression list. We treat suppression
 * as all-or-nothing per request — if any single recipient is suppressed we
 * short-circuit the whole send and record it as `suppressed`. Callers that
 * fan out should call sendEmail() once per recipient (the existing recruiter
 * notify does this), so this only bites mass-blast cases.
 */
async function findSuppressedRecipient(
  recipients: string[],
): Promise<string | null> {
  const normalized = recipients.map(normalizeAddress);
  const hit = await prisma.emailSuppression.findFirst({
    where: { address: { in: normalized } },
    select: { address: true },
  });
  return hit?.address ?? null;
}

export type EmailResult =
  | { sent: true; provider: "resend" | "console"; id?: string }
  | { sent: false; reason: string };

function resolveFrom(): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (process.env.NODE_ENV !== "production") {
    return "Interviewpad (dev) <onboarding@resend.dev>";
  }
  return "Interviewpad <noreply@interviewpad.in>";
}

export async function sendEmail<T extends TemplateName>(
  input: SendEmailInput<T>,
): Promise<EmailResult> {
  // Type narrowing of `def` to the union of all template defs causes TS to
  // demand the *intersection* of every Props at the internal call sites. The
  // public signature already enforces the per-template Props↔Template binding,
  // so widen to a structural shape with unknown props here for the routing
  // step. This is the single boundary where the type system can't follow the
  // index — and it's hidden from callers.
  type AnyDef = {
    Component: React.ComponentType<unknown>;
    subject: (p: unknown) => string;
    text: (p: unknown) => string;
  };
  const def = TEMPLATES[input.template] as unknown as AnyDef | undefined;
  if (!def) {
    return { sent: false, reason: `Unknown template: ${input.template}` };
  }
  const recipients = Array.isArray(input.to) ? input.to.filter(Boolean) : [input.to];
  if (recipients.length === 0) {
    return { sent: false, reason: "Missing recipient" };
  }

  // Suppression check (IP-25 AC #4). Done BEFORE rendering / dispatching so a
  // known-bad address never burns a Resend call. Logged so admins can see
  // attempts even though they didn't go out.
  const suppressed = await findSuppressedRecipient(recipients).catch(() => null);
  if (suppressed) {
    await prisma.emailLog
      .create({
        data: {
          template: input.template,
          recipientEmail: normalizeAddress(recipients[0]),
          workspaceId: input.workspaceId ?? null,
          sessionId: input.sessionId ?? null,
          status: "suppressed",
          errorReason: `address on suppression list (${suppressed})`,
        },
      })
      .catch(() => null);
    return { sent: false, reason: `Recipient suppressed (${suppressed})` };
  }

  // EmailLog row (IP-25 AC #2). Created in `queued` so the row exists even if
  // we crash before the dispatch returns. We use the FIRST recipient as the
  // canonical address for the row (multi-recipient fan-out is rare in this
  // codebase and individual notify-style sends already loop one at a time).
  const log = await prisma.emailLog
    .create({
      data: {
        template: input.template,
        recipientEmail: normalizeAddress(recipients[0]),
        workspaceId: input.workspaceId ?? null,
        sessionId: input.sessionId ?? null,
        status: "queued",
      },
      select: { id: true },
    })
    .catch((err) => {
      // Logging is best-effort — if Prisma fails (e.g. DB unreachable in dev
      // smoke), we still want the email to go out. Surface in console.
      console.error("[email] EmailLog write failed:", err);
      return null;
    });

  const props = input.props as unknown;
  let html: string;
  try {
    html = await render(React.createElement(def.Component, props as object));
  } catch (err) {
    const reason = `Template render failed: ${err instanceof Error ? err.message : "unknown"}`;
    if (log) await markLogFailed(log.id, reason);
    return { sent: false, reason };
  }
  const subject = def.subject(props);
  const text = def.text(props);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev fallback — surface key fields in the log so a localhost flow that
    // emits an email link is debuggable without standing up Resend.
    console.log(
      `[email:dev-stub] template=${input.template} to=${recipients.join(",")} subject="${subject}"\n${text}`,
    );
    if (log) await markLogSent(log.id, null);
    return { sent: true, provider: "console" };
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (input.idempotencyKey) headers["Idempotency-Key"] = input.idempotencyKey;

    const body: Record<string, unknown> = {
      from: resolveFrom(),
      to: recipients,
      subject,
      html,
      text,
    };
    if (input.replyTo) body.reply_to = input.replyTo;

    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const reason = `Resend ${res.status}: ${errText.slice(0, 200)}`;
      if (log) await markLogFailed(log.id, reason);
      return { sent: false, reason };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    if (log) await markLogSent(log.id, data.id ?? null);
    return { sent: true, provider: "resend", id: data.id };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "fetch failed";
    if (log) await markLogFailed(log.id, reason);
    return { sent: false, reason };
  }
}

async function markLogSent(id: string, providerId: string | null) {
  await prisma.emailLog
    .update({
      where: { id },
      data: { status: "sent", providerId, lastEventAt: new Date() },
    })
    .catch((e) => console.error("[email] EmailLog markSent failed:", e));
}

async function markLogFailed(id: string, reason: string) {
  await prisma.emailLog
    .update({
      where: { id },
      data: {
        status: "failed",
        errorReason: reason.slice(0, 500),
        lastEventAt: new Date(),
      },
    })
    .catch((e) => console.error("[email] EmailLog markFailed failed:", e));
}

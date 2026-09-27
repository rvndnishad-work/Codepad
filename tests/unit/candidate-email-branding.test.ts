/**
 * Candidate emails pick up the workspace's Candidate experience settings
 * inside the email service, so every call site gets them. Pin that against
 * a fake Resend and a fake database.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  emailSuppression: {
    findMany: vi.fn(async () => [] as { address: string }[]),
    findFirst: vi.fn(async () => null),
  },
  emailLog: {
    create: vi.fn(async () => ({ id: "log" })),
    update: vi.fn(async () => ({})),
  },
  workspace: { findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { sendEmail, sendTemplatedBatch } from "@/lib/email";

const row = (over: Record<string, unknown> = {}) => ({
  name: "Acme",
  logoUrl: "https://cdn.acme.io/logo.png",
  brandColor: "#1d4ed8",
  senderName: "Acme Talent",
  replyToEmail: "jobs@acme.io",
  replyToConfirmedAt: new Date("2026-09-01"),
  helpEmail: "help@acme.io",
  privacyNoticeUrl: "https://acme.io/privacy",
  planName: "GROWTH",
  trialEndsAt: null,
  stripeSubscriptionId: "sub_1",
  candidateEmailTemplates: [{ key: "interview-invite", subject: "Your {title} with {workspace}", body: "Hello {candidate},\n\nSee you soon." }],
  ...over,
});

const invite = (to: string) => ({
  to,
  workspaceId: "ws1",
  props: { candidateName: "Priya", workspaceName: "Acme", title: "Pairing", joinUrl: "https://example.com/j", shortCode: null, scheduledAt: null, durationMin: 60 },
});

describe("candidate email branding", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("AUTH_SECRET", "s3cret");
    vi.stubEnv("EMAIL_FROM", "Interviewpad <noreply@interviewpad.in>");
    fetchMock.mockReset();
    db.workspace.findUnique.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("applies sender, reply-to, wording, brand and unsubscribe on Growth", async () => {
    db.workspace.findUnique.mockResolvedValue(row());
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "a" }, { id: "b" }] }), { status: 200 }));
    await sendTemplatedBatch("interview-invite", [invite("a@x.io"), invite("b@x.io")]);
    // One lookup for the whole batch.
    expect(db.workspace.findUnique).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body[0].from).toBe('"Acme Talent via Interviewpad" <noreply@interviewpad.in>');
    expect(body[0].reply_to).toBe("jobs@acme.io");
    expect(body[0].subject).toBe("Your Pairing with Acme");
    expect(body[0].html).toContain("Hello Priya,");
    expect(body[0].html).toContain("https://cdn.acme.io/logo.png");
    expect(body[0].html).toContain("#1d4ed8");
    expect(body[0].html).toContain("mailto:help@acme.io");
    expect(body[0].html).toContain("https://acme.io/privacy");
    // The join link is always there, whatever the wording.
    expect(body[0].html).toContain("https://example.com/j");
    // Each recipient gets their own unsubscribe link.
    expect(body[0].html).toContain("/email/unsubscribe?e=a%40x.io");
    expect(body[1].html).toContain("/email/unsubscribe?e=b%40x.io");
    expect(body[0].text).toContain("Unsubscribe: ");
  });

  it("keeps the default sender and wording on Free, with brand and unsubscribe", async () => {
    db.workspace.findUnique.mockResolvedValue(row({ planName: "FREE", stripeSubscriptionId: null }));
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "x" }), { status: 200 }));
    await sendEmail({ template: "interview-invite", ...invite("a@x.io") });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.from).toBe("Interviewpad <noreply@interviewpad.in>");
    expect(body.reply_to).toBeUndefined();
    expect(body.subject).toBe("Live interview with Acme: Pairing");
    expect(body.html).toContain("#1d4ed8");
    expect(body.html).toContain("/email/unsubscribe?e=a%40x.io");
  });

  it("does not send reply-to before it is confirmed", async () => {
    db.workspace.findUnique.mockResolvedValue(row({ replyToConfirmedAt: null }));
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "x" }), { status: 200 }));
    await sendEmail({ template: "interview-invite", ...invite("a@x.io") });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.reply_to).toBeUndefined();
  });

  it("leaves emails to the team untouched", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "x" }), { status: 200 }));
    await sendEmail({
      template: "take-home-submitted-recruiter",
      to: "r@acme.io",
      workspaceId: "ws1",
      props: { recruiterName: "R", candidateName: "Priya", challengeTitle: "Cache", workspaceName: "Acme", reviewUrl: "https://x", score: 80 },
    });
    expect(db.workspace.findUnique).not.toHaveBeenCalled();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.html).not.toContain("/email/unsubscribe");
  });

  it("still sends when the branding lookup fails", async () => {
    db.workspace.findUnique.mockRejectedValue(new Error("db down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "x" }), { status: 200 }));
    const res = await sendEmail({ template: "interview-invite", ...invite("a@x.io") });
    expect(res.sent).toBe(true);
    err.mockRestore();
  });
});

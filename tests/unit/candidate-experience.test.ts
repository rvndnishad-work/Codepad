import { describe, expect, it } from "vitest";
import {
  CANDIDATE_EMAILS,
  CANDIDATE_EMAIL_KEYS,
  applyCandidateContext,
  applyWording,
  brandButton,
  brandColorWarning,
  brandStyle,
  candidateBrand,
  consentOutstanding,
  contrastRatio,
  fillPlaceholders,
  formatFrom,
  isCandidateTemplate,
  makeReplyToToken,
  parseWording,
  placeholderVars,
  readableTextOn,
  replyToStatus,
  replyToTokenFresh,
  replyToTokenIssuedAt,
  wordingKeyFor,
  type CandidateEmailContext,
} from "@/lib/workspace/candidate-experience";
import { unsubscribeSignature, unsubscribeUrl, verifyUnsubscribe } from "@/lib/email-unsubscribe";
import { TEMPLATES } from "@/emails";

const DAY = 86_400_000;
const vars = { candidate: "Priya", workspace: "Acme", title: "Rate limiter" };

describe("brand colours", () => {
  it("picks readable button text", () => {
    expect(readableTextOn("#ffe600")).toBe("#0b0f19");
    expect(readableTextOn("#1d4ed8")).toBe("#ffffff");
    expect(readableTextOn("#000000")).toBe("#ffffff");
    expect(readableTextOn("not a colour")).toBe("#0b0f19");
  });

  it("keeps at least WCAG AA large-text contrast for the chosen text colour", () => {
    for (const c of ["#4f46e5", "#16a34a", "#f97316", "#ec4899", "#777777", "#ffe600", "#0ea5e9"]) {
      expect(contrastRatio(c, readableTextOn(c))).toBeGreaterThanOrEqual(3);
    }
  });

  it("falls back to the default yellow button", () => {
    expect(brandButton(null)).toEqual({ background: "#ffe600", color: "#0b0f19" });
    expect(brandButton("#1D4ED8")).toEqual({ background: "#1d4ed8", color: "#ffffff" });
  });

  it("gives candidate pages CSS variables only for a real colour", () => {
    expect(brandStyle(null)).toEqual({});
    expect(brandStyle("#123")).toEqual({});
    expect(brandStyle("#1d4ed8")).toEqual({ "--brand": "#1d4ed8", "--brand-fg": "#ffffff" });
  });

  it("warns about colours that vanish into the page", () => {
    expect(brandColorWarning("#fefefe")).toMatch(/very close/);
    expect(brandColorWarning("#0b0f19")).toMatch(/very close/);
    expect(brandColorWarning("#4f46e5")).toBeNull();
  });

  it("drops unsafe logo and privacy links", () => {
    const b = candidateBrand({ name: " ", logoUrl: "http://x.io/a.png", brandColor: "red", privacyNoticeUrl: "javascript:alert(1)" });
    expect(b).toEqual({ name: "The hiring team", logoUrl: null, color: null, helpEmail: null, privacyNoticeUrl: null });
  });
});

describe("sender", () => {
  it("keeps our address and swaps the display name", () => {
    expect(formatFrom("Acme via Interviewpad", "Interviewpad <noreply@interviewpad.in>")).toBe('"Acme via Interviewpad" <noreply@interviewpad.in>');
    expect(formatFrom("Acme via Interviewpad", "noreply@x.io")).toBe('"Acme via Interviewpad" <noreply@x.io>');
  });

  it("strips characters that could break the header", () => {
    expect(formatFrom('Evil" <a@b.c>\r\nBcc: x', "noreply@x.io")).toBe('"Evil a@b.c Bcc: x" <noreply@x.io>');
  });
});

describe("reply-to tokens", () => {
  const now = new Date("2026-09-27T10:00:00Z");
  const token = makeReplyToToken("a".repeat(48), now);

  it("carries when it was made", () => {
    expect(replyToTokenIssuedAt(token)?.getTime()).toBe(now.getTime());
    expect(replyToTokenIssuedAt("nope")).toBeNull();
  });

  it("works for 7 days", () => {
    expect(replyToTokenFresh(token, new Date(now.getTime() + 6 * DAY))).toBe(true);
    expect(replyToTokenFresh(token, new Date(now.getTime() + 8 * DAY))).toBe(false);
  });

  it("reports status", () => {
    expect(replyToStatus({ replyToEmail: null, replyToConfirmedAt: null })).toBe("none");
    expect(replyToStatus({ replyToEmail: "a@b.co", replyToConfirmedAt: null })).toBe("waiting");
    expect(replyToStatus({ replyToEmail: "a@b.co", replyToConfirmedAt: now })).toBe("confirmed");
  });
});

describe("wording", () => {
  it("maps every candidate template to its editable email", () => {
    expect(wordingKeyFor("take-home-invite")).toBe("take-home-invite");
    expect(wordingKeyFor("take-home-session-invite")).toBe("take-home-invite");
    expect(wordingKeyFor("take-home-reminder")).toBe("take-home-reminder");
    expect(wordingKeyFor("take-home-submitted-candidate")).toBe("take-home-received");
    expect(wordingKeyFor("ai-screening-invite")).toBe("ai-screening-invite");
    expect(wordingKeyFor("ai-screening-invite", { reminder: true })).toBe("ai-screening-reminder");
    expect(wordingKeyFor("interview-invite")).toBe("interview-invite");
    expect(wordingKeyFor("workspace-invite")).toBeNull();
    expect(isCandidateTemplate("take-home-submitted-recruiter")).toBe(false);
  });

  it("fills placeholders once, so values cannot expand again", () => {
    expect(fillPlaceholders("Hi {candidate}, {workspace} sent {title}. {nope}", vars)).toBe("Hi Priya, Acme sent Rate limiter. {nope}");
    expect(fillPlaceholders("Hi {candidate}", { ...vars, candidate: "{workspace}" })).toBe("Hi {workspace}");
  });

  it("reads placeholder values from any template's props", () => {
    expect(placeholderVars({ candidateName: "Sam", workspaceName: "Acme", challengeTitle: "Cache" })).toEqual({ candidate: "Sam", workspace: "Acme", title: "Cache" });
    expect(placeholderVars({ candidateName: "Sam", workspaceName: "Acme", positionTitle: "Frontend" }).title).toBe("Frontend");
    expect(placeholderVars({})).toEqual({ candidate: "there", workspace: "the team", title: "your assessment" });
  });

  it("stores null for blank or default text", () => {
    const def = CANDIDATE_EMAILS["take-home-invite"];
    expect(parseWording("take-home-invite", { subject: def.subject, body: def.body })).toEqual({ ok: true, subject: null, body: null });
    expect(parseWording("take-home-invite", { subject: "  ", body: "" })).toEqual({ ok: true, subject: null, body: null });
    expect(parseWording("take-home-invite", { subject: "Hello   {candidate}", body: "Line one\r\n\r\n\r\n\r\nLine two  " })).toEqual({
      ok: true,
      subject: "Hello {candidate}",
      body: "Line one\n\nLine two",
    });
  });

  it("rejects unknown placeholders, long text and angle brackets in the subject", () => {
    const r = parseWording("interview-invite", { subject: "Hi {name}", body: "x".repeat(2001) });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.subject).toMatch(/\{name\} is not a placeholder/);
      expect(r.errors.body).toMatch(/2000 characters/);
    }
    const r2 = parseWording("interview-invite", { subject: "<b>Hi</b>" });
    expect(r2.ok).toBe(false);
  });

  it("turns saved wording into a subject and paragraphs", () => {
    expect(applyWording(null, vars)).toEqual({ subject: null, paragraphs: null });
    expect(applyWording({ subject: "For {candidate}", body: "Hi {candidate},\n\nWelcome to {workspace}.\nSee you." }, vars)).toEqual({
      subject: "For Priya",
      paragraphs: ["Hi Priya,", "Welcome to Acme.\nSee you."],
    });
  });

  it("has starting wording that only uses known placeholders", () => {
    for (const key of CANDIDATE_EMAIL_KEYS) {
      const def = CANDIDATE_EMAILS[key];
      const parsed = parseWording(key, { subject: def.subject, body: def.body });
      expect(parsed.ok).toBe(true);
    }
  });
});

describe("applyCandidateContext", () => {
  const ctx = (growth: boolean): CandidateEmailContext => ({
    brand: candidateBrand({ name: "Acme", brandColor: "#1d4ed8", helpEmail: "help@acme.io" }),
    growth,
    fromName: growth ? "Acme via Interviewpad" : null,
    replyTo: growth ? "jobs@acme.io" : null,
    wording: { "interview-invite": { subject: "Interview for {candidate}", body: "Hello {candidate}" } },
  });
  const props = { candidateName: "Priya", workspaceName: "Acme", title: "Pairing" };

  it("leaves other templates alone", () => {
    const r = applyCandidateContext(ctx(true), "workspace-invite", props, "https://u");
    expect(r).toEqual({ props, fromName: null, replyTo: null });
  });

  it("applies brand on every plan, the rest only with growth tools", () => {
    const free = applyCandidateContext(ctx(false), "interview-invite", props, "https://u");
    expect(free.props.brand?.color).toBe("#1d4ed8");
    expect(free.props.custom).toBeUndefined();
    expect(free.props.unsubscribeUrl).toBe("https://u");
    expect(free.fromName).toBeNull();
    expect(free.replyTo).toBeNull();

    const paid = applyCandidateContext(ctx(true), "interview-invite", props, "https://u");
    expect(paid.props.custom).toEqual({ subject: "Interview for Priya", paragraphs: ["Hello Priya"] });
    expect(paid.fromName).toBe("Acme via Interviewpad");
    expect(paid.replyTo).toBe("jobs@acme.io");
  });

  it("still adds the unsubscribe link without a workspace", () => {
    const r = applyCandidateContext(null, "take-home-invite", props, "https://u");
    expect(r.props.unsubscribeUrl).toBe("https://u");
    expect(r.props.brand).toBeUndefined();
  });

  it("uses the custom subject in the template registry", () => {
    const paid = applyCandidateContext(ctx(true), "interview-invite", { ...props, joinUrl: "https://j", shortCode: null, scheduledAt: null, durationMin: 60 }, null);
    expect(TEMPLATES["interview-invite"].subject(paid.props as Parameters<(typeof TEMPLATES)["interview-invite"]["subject"]>[0])).toBe("Interview for Priya");
  });
});

describe("unsubscribe links", () => {
  const secret = "test-secret";

  it("signs the lowercased address and verifies it", () => {
    const sig = unsubscribeSignature("Priya@Example.com", secret)!;
    expect(sig).toHaveLength(32);
    expect(verifyUnsubscribe("priya@example.com", sig, secret)).toBe(true);
    expect(verifyUnsubscribe("other@example.com", sig, secret)).toBe(false);
    expect(verifyUnsubscribe("priya@example.com", sig.slice(1) + "A", secret)).toBe(false);
  });

  it("builds a link on the app address", () => {
    const url = unsubscribeUrl("priya@example.com", { base: "https://app.test/", secret })!;
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://app.test/email/unsubscribe");
    expect(u.searchParams.get("e")).toBe("priya@example.com");
    expect(verifyUnsubscribe("priya@example.com", u.searchParams.get("s")!, secret)).toBe(true);
  });
});

describe("consent", () => {
  it("is only outstanding when the workspace asks and nothing is stamped", () => {
    expect(consentOutstanding({ consentRequired: false }, null)).toBe(false);
    expect(consentOutstanding({ consentRequired: true }, null)).toBe(true);
    expect(consentOutstanding({ consentRequired: true }, new Date())).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  SETTINGS_DEFAULTS,
  SETTINGS_FIELDS,
  canJoinWithoutInvite,
  checkApiKeyExpiry,
  defaultPassMarks,
  deletionFinalAt,
  diffSettings,
  fieldsOf,
  formatWorkspaceDate,
  isEmailDomainAllowed,
  normalizeDomains,
  normalizeWorkspaceSettings,
  replyToAddress,
  screeningStartValues,
  senderDisplayName,
  signInExpired,
  twoFactorRequired,
} from "@/lib/workspace/settings";
import { TAKE_HOME_PASS_MARK } from "@/lib/take-home/pass-mark";
import { SCREENING_PASS_THRESHOLD } from "@/lib/ai-interview/verdict";
import { DEFAULT_PASS_MARK } from "@/lib/interview/scorecard";
import { DEFAULT_REMINDER_PLAN } from "@/lib/take-home/reminders";
import { DEFAULT_EXPIRY_DAYS, DEFAULT_REMINDER_DAYS } from "@/lib/ai-interview/console";
import { WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { categoryOf, describeAuditRow } from "@/lib/workspace/audit-timeline";

const DAY = 86_400_000;
const base = () => normalizeWorkspaceSettings({ name: "Acme", slug: "acme" });

describe("normalizeWorkspaceSettings", () => {
  it("fills defaults that match today's behaviour", () => {
    const s = base();
    expect(s.name).toBe("Acme");
    expect(defaultPassMarks(s)).toEqual({ takeHome: TAKE_HOME_PASS_MARK, ai: SCREENING_PASS_THRESHOLD, interview: DEFAULT_PASS_MARK });
    const start = screeningStartValues(s);
    expect(start.takeHome.reminders).toEqual(DEFAULT_REMINDER_PLAN);
    expect(start.ai.expiresAfterDays).toBe(DEFAULT_EXPIRY_DAYS);
    expect(start.ai.reminderAfterDays).toBe(DEFAULT_REMINDER_DAYS);
    expect(s.allowedEmailDomains).toEqual([]);
    expect(s.timezone).toBe("UTC");
  });

  it("drops unreadable stored values back to defaults", () => {
    const s = normalizeWorkspaceSettings({
      name: "Acme",
      slug: "acme",
      timezone: "Mars/Olympus",
      dateFormat: "XYZ",
      defaultAiPassMark: 400,
      joinRole: "OWNER",
      brandColor: "red",
      sessionsRevokedAt: "2026-09-01T00:00:00.000Z",
    });
    expect(s.timezone).toBe(SETTINGS_DEFAULTS.timezone);
    expect(s.dateFormat).toBe("DMY");
    expect(s.defaultAiPassMark).toBe(SCREENING_PASS_THRESHOLD);
    expect(s.joinRole).toBe("INTERVIEWER");
    expect(s.brandColor).toBeNull();
    expect(s.sessionsRevokedAt).toEqual(new Date("2026-09-01T00:00:00.000Z"));
  });

  it("keeps valid stored values", () => {
    const s = normalizeWorkspaceSettings({ name: "A", slug: "a", timezone: "Europe/London", defaultInterviewPassMark: 3.5, scorecardReminderHours: 24 });
    expect(s.timezone).toBe("Europe/London");
    expect(s.defaultInterviewPassMark).toBe(3.5);
    expect(s.scorecardReminderHours).toBe(24);
  });
});

describe("diffSettings", () => {
  const opts = { growth: true, owner: true };

  it("returns only changed fields with readable before and after", () => {
    const d = diffSettings(base(), "screening-defaults", { defaultTakeHomePassMark: "70", remindNotStarted: true, inviteExpiryDays: 14 }, opts);
    expect(d.errors).toEqual({});
    expect(d.changes.map((c) => [c.field, c.value, c.from, c.to])).toEqual([
      ["defaultTakeHomePassMark", 70, "60", "70"],
      ["inviteExpiryDays", 14, "7 days", "14 days"],
    ]);
  });

  it("rejects fields from another tab, unknown fields and bad values", () => {
    const d = diffSettings(base(), "general", { require2faForAll: true, nope: 1, timezone: "Nowhere/Else", slug: "-bad-" }, opts);
    expect(Object.keys(d.errors).sort()).toEqual(["nope", "require2faForAll", "slug", "timezone"]);
    expect(d.changes).toEqual([]);
  });

  it("gates Growth and owner-only fields", () => {
    const d = diffSettings(base(), "candidate-experience", { senderName: "Acme hiring", brandColor: "#ABC" }, { growth: false, owner: true });
    expect(d.errors.senderName).toMatch(/Growth/);
    expect(d.changes).toEqual([expect.objectContaining({ field: "brandColor", value: "#aabbcc" })]);
    const g = diffSettings(base(), "general", { slug: "acme-hiring" }, { growth: true, owner: false });
    expect(g.errors.slug).toMatch(/owner/);
  });

  it("snaps the interview pass mark and normalises domains", () => {
    const d = diffSettings(base(), "screening-defaults", { defaultInterviewPassMark: 3.4 }, opts);
    expect(d.changes[0].value).toBe(3.5);
    const s = diffSettings(base(), "security", { allowedEmailDomains: "Acme.com, @beta.io\nacme.com" }, opts);
    expect(s.changes[0].value).toEqual(["acme.com", "beta.io"]);
    expect(s.changes[0].to).toBe("acme.com, beta.io");
  });

  it("puts every field in exactly one group", () => {
    const all = ["general", "candidate-experience", "screening-defaults", "security", "data-privacy", "billing"] as const;
    const counted = all.flatMap((g) => fieldsOf(g));
    expect(counted.sort()).toEqual(Object.keys(SETTINGS_FIELDS).sort());
  });
});

describe("helpers", () => {
  it("checks email domains, including subdomains", () => {
    const s = { ...base(), allowedEmailDomains: ["acme.com"] };
    expect(isEmailDomainAllowed(s, "a@acme.com")).toBe(true);
    expect(isEmailDomainAllowed(s, "a@eu.acme.com")).toBe(true);
    expect(isEmailDomainAllowed(s, "a@notacme.com")).toBe(false);
    expect(isEmailDomainAllowed(base(), "a@anything.io")).toBe(true);
    expect(canJoinWithoutInvite({ ...s, joinWithoutInvite: true }, "b@acme.com")).toBe(true);
    expect(canJoinWithoutInvite({ ...base(), joinWithoutInvite: true }, "b@acme.com")).toBe(false);
    expect(normalizeDomains("not a domain").ok).toBe(false);
  });

  it("requires two-factor for paid admins always and for everyone from the start date", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    expect(twoFactorRequired(base(), { role: "ADMIN" }, "GROWTH", now)).toBe(true);
    expect(twoFactorRequired(base(), { role: "RECRUITER" }, "GROWTH", now)).toBe(false);
    const later = { ...base(), require2faForAll: true, require2faFrom: new Date("2026-10-15T00:00:00Z") };
    expect(twoFactorRequired(later, { role: "RECRUITER" }, "FREE", now)).toBe(false);
    expect(twoFactorRequired(later, { role: "RECRUITER" }, "FREE", new Date("2026-10-15T00:00:00Z"))).toBe(true);
  });

  it("expires sign-ins after a sign-out-everyone or the max age", () => {
    const now = new Date("2026-10-10T00:00:00Z");
    const signedIn = new Date("2026-10-01T00:00:00Z");
    expect(signInExpired(base(), signedIn, now)).toBe(false);
    expect(signInExpired({ ...base(), sessionsRevokedAt: new Date("2026-10-02T00:00:00Z") }, signedIn, now)).toBe(true);
    expect(signInExpired({ ...base(), sessionMaxAgeDays: 7 }, signedIn, now)).toBe(true);
    expect(signInExpired({ ...base(), sessionMaxAgeDays: 14 }, signedIn, now)).toBe(false);
  });

  it("limits API key lifetimes", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    const s = { ...base(), apiKeyMaxLifetimeDays: 90 };
    expect(checkApiKeyExpiry(base(), null, now).ok).toBe(true);
    expect(checkApiKeyExpiry(s, null, now).ok).toBe(false);
    expect(checkApiKeyExpiry(s, new Date(now.getTime() + 30 * DAY), now).ok).toBe(true);
    expect(checkApiKeyExpiry(s, new Date(now.getTime() + 120 * DAY), now).ok).toBe(false);
  });

  it("builds sender, reply-to, deletion date and formatted dates", () => {
    expect(senderDisplayName(base())).toBe("Acme via Interviewpad");
    expect(senderDisplayName({ ...base(), senderName: "Acme hiring" })).toBe("Acme hiring via Interviewpad");
    expect(replyToAddress({ replyToEmail: "jobs@acme.com", replyToConfirmedAt: null })).toBeNull();
    expect(replyToAddress({ replyToEmail: "jobs@acme.com", replyToConfirmedAt: new Date() })).toBe("jobs@acme.com");
    expect(deletionFinalAt({ deletionScheduledAt: new Date("2026-10-01T00:00:00Z") })).toEqual(new Date("2026-10-31T00:00:00Z"));
    const d = new Date("2026-09-26T23:30:00Z");
    expect(formatWorkspaceDate(d, { timezone: "UTC", dateFormat: "DMY" })).toBe("26 Sep 2026");
    expect(formatWorkspaceDate(d, { timezone: "UTC", dateFormat: "MDY" })).toBe("Sep 26, 2026");
    expect(formatWorkspaceDate(d, { timezone: "Asia/Kolkata", dateFormat: "YMD" })).toBe("2026-09-27");
  });
});

describe("administration audit actions", () => {
  const row = (action: string, meta: Record<string, unknown> = {}) =>
    describeAuditRow({ action, actorEmail: "o@acme.com", actorUserId: null, targetType: "workspace", targetId: "w1", meta });

  it("files every new action under a category", () => {
    const expected: Record<string, string> = {
      WORKSPACE_SETTINGS_CHANGED: "settings",
      SECURITY_POLICY_CHANGED: "settings",
      SECURITY_2FA_REMINDER_SENT: "settings",
      MEMBERS_SIGNED_OUT: "settings",
      MEMBER_JOINED: "people",
      MEMBER_WORK_HANDED_OVER: "people",
      MEMBER_OWNERSHIP_TRANSFERRED: "people",
      MEMBER_OWNER_ADDED: "people",
      MEMBERS_BULK_INVITED: "people",
      PLAN_CHANGED: "billing",
      SUBSCRIPTION_STARTED: "billing",
      SUBSCRIPTION_CANCELLED: "billing",
      SUBSCRIPTION_PAYMENT_FAILED: "billing",
      CREDITS_PURCHASED: "billing",
      VIDEO_ADDON_ENABLED: "billing",
      VIDEO_ADDON_DISABLED: "billing",
      CREDITS_LOW_ALERT_SENT: "billing",
      TRIAL_ENDED: "billing",
      INTERVIEW_INVITE_RESENT: "screenings",
      INTERVIEW_CANCELLED: "screenings",
      EMAIL_TEMPLATE_CHANGED: "settings",
      REPLY_TO_CONFIRMATION_SENT: "settings",
      REPLY_TO_CONFIRMED: "settings",
      RETENTION_ITEMS_ERASED: "settings",
      RETENTION_NOTICE_SENT: "settings",
      RETENTION_RULE_CHANGED: "settings",
      DATA_REQUEST_CREATED: "settings",
      DATA_REQUEST_COMPLETED: "settings",
      WORKSPACE_EXPORT_REQUESTED: "settings",
      WORKSPACE_DELETION_SCHEDULED: "settings",
      WORKSPACE_DELETION_CANCELLED: "settings",
    };
    for (const [action, cat] of Object.entries(expected)) {
      expect(WORKSPACE_AUDIT_ACTIONS).toHaveProperty(action, action);
      expect([action, categoryOf(action)]).toEqual([action, cat]);
      // Every one reads as a sentence, not the raw action name.
      expect(row(action).title).not.toMatch(/_/);
    }
  });

  it("describes a settings change with before and after and a link to the tab", () => {
    const s = row("WORKSPACE_SETTINGS_CHANGED", { tab: "screening-defaults", field: "defaultTakeHomePassMark", label: "Take-home pass mark", from: "60", to: "70" });
    expect(s.title).toBe("Changed take-home pass mark");
    expect(s.detail).toBe("From 60 to 70.");
    expect(s.path).toBe("settings/screening-defaults");
  });

  it("describes billing, people and data rows", () => {
    expect(row("PLAN_CHANGED", { from: "Free", to: "Growth" })).toMatchObject({ title: "Changed the plan to Growth", detail: "Was Free." });
    expect(row("MEMBERS_BULK_INVITED", { count: 5, emails: ["a@x.com", "b@x.com"] })).toMatchObject({
      title: "Invited 5 people",
      detail: "a@x.com, b@x.com and 3 more.",
    });
    expect(row("MEMBER_JOINED", { name: "Priya", role: "Recruiter", via: "domain" })).toMatchObject({
      title: "Priya joined the workspace",
      detail: "Joined without an invite as recruiter.",
    });
    expect(row("DATA_REQUEST_COMPLETED", { email: "c@x.com", kind: "ERASE", itemCount: 12 })).toMatchObject({
      title: "Erased the data of c@x.com",
      detail: "12 records.",
      tone: "danger",
    });
    expect(row("WORKSPACE_DELETION_SCHEDULED", { finalAt: "2026-10-27T00:00:00.000Z" }).tone).toBe("danger");
  });
});

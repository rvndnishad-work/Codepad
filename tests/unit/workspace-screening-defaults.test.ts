import { describe, expect, it } from "vitest";
import {
  checkLogoFile,
  choicesWith,
  interviewEndedAt,
  interviewStartMinutes,
  isReservedSlug,
  isUploadedLogoUrl,
  LOGO_MAX_BYTES,
  movedSlugPath,
  presetFor,
  scorecardReminderState,
  sniffImageType,
  timezoneLabel,
  timezoneList,
  uploadedLogoUrl,
  type ScorecardReminderSubject,
} from "@/lib/workspace/screening-defaults";
import { diffSettings, normalizeWorkspaceSettings, screeningStartValues, SETTINGS_FIELDS } from "@/lib/workspace/settings";
import { DEFAULT_LAST_CALL_HOURS, DEFAULT_START_REMINDER_HOURS } from "@/lib/take-home/reminders";
import { FORMAT_BY_ID, suggestedMinutes, type WizardRound } from "@/lib/interview/wizard";
import { canSeeOthers } from "@/lib/interview/scorecard";
import { DEFAULT_THEORY, fallbackFollowUp, followUpPrompt, parseTheorySettings, sanitizeTheory } from "@/lib/ai-interview/theory";
import { interviewerLanguageLabel, interviewerLanguageOf, speechLangOf } from "@/lib/ai-interview/languages";

const HOUR = 3_600_000;
const DAY = 86_400_000;
const base = () => normalizeWorkspaceSettings({ name: "Acme", slug: "acme" });

describe("choices and presets", () => {
  it("adds a default the composer does not offer, in order", () => {
    expect(choicesWith([3, 5, 7, 10, 14], 30)).toEqual([3, 5, 7, 10, 14, 30]);
    expect(choicesWith([3, 5, 7, 10, 14], 7)).toEqual([3, 5, 7, 10, 14]);
    expect(choicesWith([5, 10], null)).toEqual([5, 10]);
    expect(choicesWith([5, 10], -1)).toEqual([5, 10]);
  });

  it("finds the preset button for a pass mark, or custom", () => {
    expect(presetFor([50, 60, 70, 80], 70)).toBe(70);
    expect(presetFor([50, 60, 70, 80], 65)).toBe("custom");
    expect(presetFor([2.5, 3, 3.5], 3)).toBe(3);
    expect(presetFor([2.5, 3, 3.5], 3.25)).toBe("custom");
  });
});

describe("interview length", () => {
  it("keeps each format's usual length when the workspace default is 60", () => {
    for (const f of Object.values(FORMAT_BY_ID)) expect(interviewStartMinutes(f.minutes, 60)).toBe(f.minutes);
  });

  it("moves every format by the same amount", () => {
    expect(interviewStartMinutes(FORMAT_BY_ID.coding.minutes, 45)).toBe(45);
    expect(interviewStartMinutes(FORMAT_BY_ID.intro.minutes, 45)).toBe(15);
    expect(interviewStartMinutes(FORMAT_BY_ID.mixed.minutes, 90)).toBe(120);
    expect(interviewStartMinutes(null, 90)).toBe(90);
  });

  it("stays within the wizard limits", () => {
    expect(interviewStartMinutes(FORMAT_BY_ID.intro.minutes, 30)).toBe(15);
    expect(interviewStartMinutes(240, 90, { min: 15, max: 240 })).toBe(240);
  });

  it("feeds the wizard's suggested length, and rounds still stretch it", () => {
    expect(suggestedMinutes(FORMAT_BY_ID.coding, [])).toBe(60);
    expect(suggestedMinutes(FORMAT_BY_ID.coding, [], 45)).toBe(45);
    const rounds: WizardRound[] = [
      { key: "a", kind: "challenge", id: "a", title: "A", minutes: 45 },
      { key: "b", kind: "challenge", id: "b", title: "B", minutes: 30 },
    ];
    // 75 minutes of rounds plus 10 minutes, rounded up to 90, beats the 45 minute start.
    expect(suggestedMinutes(FORMAT_BY_ID.coding, rounds, 45)).toBe(90);
  });
});

describe("scorecard reminder", () => {
  const ended = new Date("2026-09-20T10:00:00Z");
  const subject = (p: Partial<ScorecardReminderSubject> = {}): ScorecardReminderSubject => ({
    status: "completed",
    scheduledAt: new Date(ended.getTime() - HOUR),
    finishedAt: ended,
    totalSec: 3600,
    scorecardReminderHours: 24,
    scorecardAutoRemindedAt: null,
    ...p,
  });

  it("uses the end of the room, or the planned end when nobody ended it", () => {
    expect(interviewEndedAt(subject())).toEqual(ended);
    expect(interviewEndedAt(subject({ status: "in_progress", finishedAt: null }))).toEqual(ended);
    expect(interviewEndedAt(subject({ status: "scheduled" }))).toBeNull();
    expect(interviewEndedAt(subject({ status: "abandoned" }))).toBeNull();
  });

  it("waits until the hours have passed, then sends once", () => {
    expect(scorecardReminderState(subject(), new Date(ended.getTime() + 23 * HOUR))).toBe("wait");
    expect(scorecardReminderState(subject(), new Date(ended.getTime() + 24 * HOUR))).toBe("send");
    expect(scorecardReminderState(subject({ scorecardAutoRemindedAt: new Date() }), new Date(ended.getTime() + 30 * HOUR))).toBe("wait");
  });

  it("never sends when the reminder is off or the interview did not happen", () => {
    const late = new Date(ended.getTime() + 3 * DAY);
    expect(scorecardReminderState(subject({ scorecardReminderHours: null }), late)).toBe("wait");
    expect(scorecardReminderState(subject({ status: "scheduled" }), late)).toBe("wait");
  });

  it("drops a reminder that is more than a week late", () => {
    expect(scorecardReminderState(subject({ scorecardReminderHours: 2 }), new Date(ended.getTime() + 2 * HOUR + 8 * DAY))).toBe("drop");
  });
});

describe("scorecard before seeing others", () => {
  it("hides the others from an interviewer who has not submitted, unless the interview turned it off", () => {
    expect(canSeeOthers({ isReviewer: true, hasSubmitted: false })).toBe(false);
    expect(canSeeOthers({ isReviewer: true, hasSubmitted: false, scorecardFirst: true })).toBe(false);
    expect(canSeeOthers({ isReviewer: true, hasSubmitted: false, scorecardFirst: false })).toBe(true);
    expect(canSeeOthers({ isReviewer: true, hasSubmitted: true })).toBe(true);
    expect(canSeeOthers({ isReviewer: false, hasSubmitted: false })).toBe(true);
  });
});

describe("logo", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
  const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>");

  it("takes PNG, JPG and WebP up to the size limit", () => {
    expect(checkLogoFile({ type: "image/png", size: 1000 })).toEqual({ ok: true });
    expect(checkLogoFile({ type: "image/svg+xml", size: 1000 }).ok).toBe(false);
    expect(checkLogoFile({ type: "image/png", size: LOGO_MAX_BYTES + 1 }).ok).toBe(false);
    expect(checkLogoFile({ type: "image/png", size: 0 }).ok).toBe(false);
  });

  it("reads the real type from the bytes", () => {
    expect(sniffImageType(png)).toBe("image/png");
    expect(sniffImageType(jpg)).toBe("image/jpeg");
    expect(sniffImageType(webp)).toBe("image/webp");
    expect(sniffImageType(svg)).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });

  it("builds a versioned address and recognises its own uploads", () => {
    const url = uploadedLogoUrl("https://app.example.com/", "ws1", 1_700_000_000_000);
    expect(url).toMatch(/^https:\/\/app\.example\.com\/api\/workspace-logo\/ws1\?v=[0-9a-z]+$/);
    expect(isUploadedLogoUrl(url, "ws1")).toBe(true);
    expect(isUploadedLogoUrl(url, "ws2")).toBe(false);
    expect(isUploadedLogoUrl("https://cdn.example.com/logo.png", "ws1")).toBe(false);
    expect(isUploadedLogoUrl(null, "ws1")).toBe(false);
  });

  it("accepts an uploaded logo on a local dev server but not plain http elsewhere", () => {
    expect(SETTINGS_FIELDS.logoUrl.parse("http://localhost:3000/api/workspace-logo/ws1?v=1")).toEqual({
      ok: true,
      value: "http://localhost:3000/api/workspace-logo/ws1?v=1",
    });
    expect(SETTINGS_FIELDS.logoUrl.parse("http://example.com/logo.png").ok).toBe(false);
    expect(SETTINGS_FIELDS.logoUrl.parse("https://example.com/logo.png").ok).toBe(true);
  });
});

describe("web address", () => {
  it("opens the same page at the new address", () => {
    expect(movedSlugPath("/w/acme/candidates?stage=NEW", "acme", "acme-hr")).toBe("/w/acme-hr/candidates?stage=NEW");
    expect(movedSlugPath("/w/acme", "acme", "acme-hr")).toBe("/w/acme-hr");
    expect(movedSlugPath("/w/acme?x=1", "acme", "acme-hr")).toBe("/w/acme-hr?x=1");
    expect(movedSlugPath("/w/acme/interviews/i1/lobby", "acme", "beta")).toBe("/w/beta/interviews/i1/lobby");
  });

  it("goes to the workspace home when the path is missing or belongs elsewhere", () => {
    expect(movedSlugPath(null, "acme", "beta")).toBe("/w/beta");
    expect(movedSlugPath("/w/acmecorp/candidates", "acme", "beta")).toBe("/w/beta");
    expect(movedSlugPath("/evil", "acme", "beta")).toBe("/w/beta");
  });

  it("keeps addresses used by our own pages", () => {
    expect(isReservedSlug("create")).toBe(true);
    expect(isReservedSlug("__system")).toBe(true);
    expect(isReservedSlug("acme")).toBe(false);
  });
});

describe("time zones", () => {
  it("lists UTC first and labels zones with their offset", () => {
    const zones = timezoneList();
    expect(zones[0]).toBe("UTC");
    expect(zones).toContain("Asia/Kolkata");
    expect(timezoneLabel("Asia/Kolkata", new Date("2026-01-15T00:00:00Z"))).toBe("Asia / Kolkata (GMT+5:30)");
    expect(timezoneLabel("UTC", new Date("2026-01-15T00:00:00Z"))).toBe("UTC (GMT+0)");
  });
});

describe("screening start values", () => {
  it("keeps the usual schedule switched off when both reminders are off", () => {
    const s = { ...base(), remindNotStarted: false, remindBeforeDeadline: false };
    expect(screeningStartValues(s).takeHome.reminders).toEqual({
      startAfterHours: DEFAULT_START_REMINDER_HOURS,
      beforeDeadlineHours: DEFAULT_LAST_CALL_HOURS,
      off: true,
    });
    expect(screeningStartValues(s).ai.reminderAfterDays).toBe(0);
  });

  it("drops just the reminder that is off", () => {
    const s = { ...base(), remindNotStarted: false };
    expect(screeningStartValues(s).takeHome.reminders).toEqual({ startAfterHours: null, beforeDeadlineHours: DEFAULT_LAST_CALL_HOURS, off: false });
  });

  it("carries the AI and interview defaults", () => {
    const s = {
      ...base(),
      defaultAiPassMark: 70,
      aiDefaultMinutes: 45,
      keepVoiceAnswers: true,
      interviewerLanguage: "es",
      defaultInterviewPassMark: 3.5,
      scorecardFirst: false,
      scorecardReminderHours: 24,
    };
    const start = screeningStartValues(s);
    expect(start.ai).toMatchObject({ passMark: 70, estimatedMinutes: 45, recordAudio: true, language: "es" });
    expect(start.interview).toEqual({ passMark: 3.5, minutes: 60, scorecardFirst: false, scorecardReminderHours: 24 });
  });

  it("audits screening default changes in plain words", () => {
    const { changes, errors } = diffSettings(
      base(),
      "screening-defaults",
      { defaultTakeHomePassMark: 70, scorecardReminderHours: 24, interviewerLanguage: "fr", defaultInterviewPassMark: 3.5 },
      { growth: false, owner: false },
    );
    expect(errors).toEqual({});
    expect(changes.map((c) => [c.field, c.from, c.to])).toEqual([
      ["defaultTakeHomePassMark", "60", "70"],
      ["scorecardReminderHours", "Off", "24 hours after"],
      ["interviewerLanguage", "English", "French"],
      ["defaultInterviewPassMark", "3.0", "3.5"],
    ]);
  });

  it("refuses marks outside the scale", () => {
    const { errors } = diffSettings(base(), "screening-defaults", { defaultAiPassMark: 10, defaultInterviewPassMark: 5 }, { growth: false, owner: false });
    expect(errors.defaultAiPassMark).toBeTruthy();
    expect(errors.defaultInterviewPassMark).toBeTruthy();
  });
});

describe("interviewer language", () => {
  it("maps ids to labels and speech tags, falling back to English", () => {
    expect(interviewerLanguageOf("es")).toBe("es");
    expect(interviewerLanguageOf("xx")).toBe("en");
    expect(interviewerLanguageLabel("de")).toBe("German");
    expect(speechLangOf("ja")).toBe("ja-JP");
    expect(speechLangOf(undefined)).toBe("en-US");
  });

  it("keeps a theory round's language, and reads old rounds as English", () => {
    expect(sanitizeTheory({ ...DEFAULT_THEORY, language: "fr" }).language).toBe("fr");
    expect(sanitizeTheory({ ...DEFAULT_THEORY, language: "klingon" }).language).toBe("en");
    expect(parseTheorySettings(JSON.stringify({ count: null, secondsPerQuestion: 120, followUps: 1, answerMode: "voice", recordAudio: false })).language).toBe("en");
  });

  it("asks for follow-ups in the round's language", () => {
    const p = { positionTitle: "Engineer", question: "Q", answer: "A", earlier: [] };
    expect(followUpPrompt(p)).not.toMatch(/The interview is in/);
    expect(followUpPrompt({ ...p, language: "es" })).toMatch(/The interview is in Spanish: write the follow-up in Spanish\.$/);
  });

  it("skips the English stand-in follow-up in other languages", () => {
    expect(fallbackFollowUp("too short")).toBeTruthy();
    expect(fallbackFollowUp("too short", "es")).toBeNull();
  });
});

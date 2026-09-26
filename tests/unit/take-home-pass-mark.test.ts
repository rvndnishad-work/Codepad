import { describe, expect, it } from "vitest";
import {
  BORDERLINE_BAND,
  sampleScores,
  TAKE_HOME_PASS_MARK,
  takeHomePassMarkOf,
  takeHomeVerdict,
} from "@/lib/take-home/pass-mark";
import { describeScore, passCheck, type CandidateResult } from "@/lib/crm/results";
import {
  cleanReminderPlan,
  DEFAULT_REMINDER_PLAN,
  describeReminderPlan,
  dueReminder,
  remindersActive,
  type ReminderSubject,
} from "@/lib/take-home/reminders";

describe("take-home pass mark", () => {
  it("defaults to 60 and clamps to 30 to 95", () => {
    expect(TAKE_HOME_PASS_MARK).toBe(60);
    expect(takeHomePassMarkOf(null)).toBe(60);
    expect(takeHomePassMarkOf(undefined)).toBe(60);
    expect(takeHomePassMarkOf(Number.NaN)).toBe(60);
    expect(takeHomePassMarkOf(10)).toBe(30);
    expect(takeHomePassMarkOf(120)).toBe(95);
    expect(takeHomePassMarkOf(72.4)).toBe(72);
  });

  it("labels Good match at or above the mark, Borderline within 10 below, then Below the mark", () => {
    // The board's example with a 70% mark.
    expect(takeHomeVerdict(84, 70)).toMatchObject({ label: "Good match", atMark: true, tone: "success" });
    expect(takeHomeVerdict(70, 70)).toMatchObject({ label: "Good match", atMark: true });
    expect(takeHomeVerdict(68, 70)).toMatchObject({ label: "Borderline", atMark: false, tone: "warning" });
    expect(takeHomeVerdict(70 - BORDERLINE_BAND, 70)).toMatchObject({ label: "Borderline" });
    expect(takeHomeVerdict(59, 70)).toMatchObject({ label: "Below the mark", atMark: false, tone: "danger" });
    expect(takeHomeVerdict(52, 70)).toMatchObject({ label: "Below the mark" });
  });

  it("uses the default mark when none is set and returns null without a score", () => {
    expect(takeHomeVerdict(60)).toMatchObject({ label: "Good match" });
    expect(takeHomeVerdict(59)).toMatchObject({ label: "Borderline" });
    expect(takeHomeVerdict(null, 70)).toBeNull();
  });

  it("relabels the same score when the mark moves, without changing the score", () => {
    expect(takeHomeVerdict(65, 60)?.label).toBe("Good match");
    expect(takeHomeVerdict(65, 70)?.label).toBe("Borderline");
    expect(takeHomeVerdict(65, 80)?.label).toBe("Below the mark");
  });

  it("offers preview scores that show all three labels", () => {
    for (const mark of [30, 60, 70, 95]) {
      expect(sampleScores(mark).map((s) => takeHomeVerdict(s, mark)?.match)).toEqual(["good", "borderline", "below"]);
    }
  });

  it("feeds the candidate results and the manual-override check, never a pass", () => {
    expect(describeScore("take_home", 65, null, null, 70)).toEqual({ verdict: "Borderline", passed: false });
    expect(describeScore("take_home", 65, null, null, 60)).toEqual({ verdict: "Good match", passed: true });

    const result = (passMark: number): CandidateResult => ({
      id: "r1",
      candidateId: "c1",
      kind: "take_home",
      title: "Payments API",
      state: "scored",
      score: 65,
      rating: null,
      ...describeScore("take_home", 65, null, null, passMark),
      passMark,
      sentAt: "2026-09-20T10:00:00.000Z",
      startedAt: null,
      finishedAt: "2026-09-21T10:00:00.000Z",
      deadlineAt: null,
      scheduledAt: null,
      minutesTaken: null,
      minutesAllowed: null,
      href: null,
    });
    // At a 70 mark, passing needs a confirmed override; at 60 it does not.
    expect(passCheck([result(70)]).override).toBe(true);
    expect(passCheck([result(70)]).reason).toContain("Take-home 65, Borderline");
    expect(passCheck([result(60)]).override).toBe(false);
  });
});

describe("take-home reminders", () => {
  const H = 3_600_000;
  const now = new Date("2026-09-26T12:00:00.000Z");
  const subject = (patch: Partial<ReminderSubject> = {}): ReminderSubject => ({
    status: "scheduled",
    sentAt: new Date(now.getTime() - 50 * H),
    deadlineAt: new Date(now.getTime() + 5 * 24 * H),
    started: false,
    reminderSentAt: null,
    startReminderSentAt: null,
    hasEmail: true,
    ...patch,
  });

  it("keeps today's behaviour by default: a last call 24 hours before the deadline", () => {
    expect(DEFAULT_REMINDER_PLAN.beforeDeadlineHours).toBe(24);
    const plan = { ...DEFAULT_REMINDER_PLAN, startAfterHours: null };
    expect(dueReminder(subject({ deadlineAt: new Date(now.getTime() + 23 * H) }), plan, now)).toBe("last_call");
    expect(dueReminder(subject({ deadlineAt: new Date(now.getTime() + 25 * H) }), plan, now)).toBeNull();
  });

  it("nudges someone who has not started once enough time has passed", () => {
    const plan = { startAfterHours: 48, beforeDeadlineHours: 24, off: false };
    expect(dueReminder(subject(), plan, now)).toBe("not_started");
    expect(dueReminder(subject({ sentAt: new Date(now.getTime() - 47 * H) }), plan, now)).toBeNull();
    expect(dueReminder(subject({ started: true }), plan, now)).toBeNull();
    expect(dueReminder(subject({ status: "in_progress" }), plan, now)).toBeNull();
    expect(dueReminder(subject({ startReminderSentAt: new Date() }), plan, now)).toBeNull();
    // A reminder sent by hand already did the nudging.
    expect(dueReminder(subject({ reminderSentAt: new Date() }), plan, now)).toBeNull();
  });

  it("prefers the last call when both are due, and sends each only once", () => {
    const plan = { startAfterHours: 24, beforeDeadlineHours: 48, off: false };
    const close = subject({ deadlineAt: new Date(now.getTime() + 10 * H) });
    expect(dueReminder(close, plan, now)).toBe("last_call");
    expect(dueReminder({ ...close, reminderSentAt: new Date() }, plan, now)).toBeNull();
  });

  it("sends nothing when switched off, closed, past the deadline or without an email", () => {
    const plan = { startAfterHours: 24, beforeDeadlineHours: 48, off: false };
    const due = subject({ deadlineAt: new Date(now.getTime() + 10 * H) });
    expect(dueReminder(due, { ...plan, off: true }, now)).toBeNull();
    expect(dueReminder({ ...due, status: "completed" }, plan, now)).toBeNull();
    expect(dueReminder({ ...due, status: "cancelled" }, plan, now)).toBeNull();
    expect(dueReminder({ ...due, deadlineAt: new Date(now.getTime() - H) }, plan, now)).toBeNull();
    expect(dueReminder({ ...due, hasEmail: false }, plan, now)).toBeNull();
    expect(dueReminder(due, { startAfterHours: null, beforeDeadlineHours: null, off: false }, now)).toBeNull();
  });

  it("snaps untrusted schedules to the offered choices", () => {
    expect(cleanReminderPlan({ startAfterHours: 50, beforeDeadlineHours: 1, off: false })).toEqual({ startAfterHours: 48, beforeDeadlineHours: 12, off: false });
    expect(cleanReminderPlan({ startAfterHours: null, beforeDeadlineHours: "abc", off: "yes" })).toEqual({ startAfterHours: null, beforeDeadlineHours: null, off: false });
    expect(cleanReminderPlan(null)).toEqual(DEFAULT_REMINDER_PLAN);
  });

  it("describes a plan in plain words", () => {
    expect(describeReminderPlan({ startAfterHours: 48, beforeDeadlineHours: 24, off: false })).toBe("After 2 days if not started, and 1 day before the deadline");
    expect(describeReminderPlan({ startAfterHours: null, beforeDeadlineHours: 12, off: false })).toBe("12 hours before the deadline");
    expect(describeReminderPlan({ startAfterHours: 48, beforeDeadlineHours: 24, off: true })).toBe("Off");
    expect(remindersActive({ startAfterHours: null, beforeDeadlineHours: null, off: false })).toBe(false);
  });
});

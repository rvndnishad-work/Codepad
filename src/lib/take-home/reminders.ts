/**
 * Automatic take-home reminders. Each send picks a schedule in the composer
 * and a recruiter can change it or switch it off later:
 *
 *   - "If not started, remind after N days": one email to candidates who have
 *     not opened any question N days after the invite went out.
 *   - "Last call N hours before the invite expires": one email to anyone who
 *     has not submitted, N hours before the deadline to start.
 *
 * The take-home-reminders cron sends them; this module decides which one is
 * due. Pure, so the cron, the actions and the tests share it.
 */

const HOUR = 3_600_000;

/** Hours after the invite for the "not started" nudge. */
export const START_REMINDER_CHOICES = [24, 48, 72] as const;
/** Hours before the deadline for the last call. */
export const LAST_CALL_CHOICES = [12, 24, 48] as const;

export const DEFAULT_START_REMINDER_HOURS = 48;
/** What every take-home got before reminders were configurable. */
export const DEFAULT_LAST_CALL_HOURS = 24;

export type ReminderPlan = {
  /** Null skips the "not started" nudge. */
  startAfterHours: number | null;
  /** Null skips the last call. */
  beforeDeadlineHours: number | null;
  /** Switched off: no automatic reminder goes out, whatever the schedule says. */
  off: boolean;
};

export const DEFAULT_REMINDER_PLAN: ReminderPlan = {
  startAfterHours: DEFAULT_START_REMINDER_HOURS,
  beforeDeadlineHours: DEFAULT_LAST_CALL_HOURS,
  off: false,
};

function pick(value: unknown, choices: readonly number[]): number | null {
  const n = Number(value);
  if (value == null || value === "" || !Number.isFinite(n) || n <= 0) return null;
  // Snap to the nearest offered choice so a crafted value cannot schedule spam.
  return choices.reduce((best, c) => (Math.abs(c - n) < Math.abs(best - n) ? c : best), choices[0]);
}

/** A plan from untrusted input, snapped to the offered choices. */
export function cleanReminderPlan(input: Partial<Record<keyof ReminderPlan, unknown>> | null | undefined): ReminderPlan {
  if (!input) return { ...DEFAULT_REMINDER_PLAN };
  return {
    startAfterHours: pick(input.startAfterHours, START_REMINDER_CHOICES),
    beforeDeadlineHours: pick(input.beforeDeadlineHours, LAST_CALL_CHOICES),
    off: input.off === true,
  };
}

/** Whether any reminder can go out under this plan. */
export function remindersActive(plan: ReminderPlan): boolean {
  return !plan.off && (plan.startAfterHours != null || plan.beforeDeadlineHours != null);
}

/** "2 days" for 48, "12 hours" for 12. */
export function hoursLabel(hours: number): string {
  if (hours % 24 === 0) {
    const d = hours / 24;
    return `${d} day${d === 1 ? "" : "s"}`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/** One line describing the plan, for the report and the composer summary. */
export function describeReminderPlan(plan: ReminderPlan): string {
  if (!remindersActive(plan)) return "Off";
  const parts: string[] = [];
  if (plan.startAfterHours != null) parts.push(`after ${hoursLabel(plan.startAfterHours)} if not started`);
  if (plan.beforeDeadlineHours != null) parts.push(`${hoursLabel(plan.beforeDeadlineHours)} before the deadline`);
  const text = parts.join(", and ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type ReminderKind = "not_started" | "last_call";

export type ReminderSubject = {
  /** Stored session status: only "scheduled" and "in_progress" are open. */
  status: string;
  /** When the invite went out. */
  sentAt: Date;
  deadlineAt: Date | null;
  /** Any question answered or opened. */
  started: boolean;
  /** Stamp of the last-call reminder (also set by a manual reminder). */
  reminderSentAt: Date | null;
  /** Stamp of the "not started" nudge. */
  startReminderSentAt: Date | null;
  hasEmail: boolean;
};

/**
 * Which automatic reminder is due now, or null. The last call wins when both
 * are due, so a candidate never gets two emails in one run. A manual reminder
 * stamps `reminderSentAt` too, so it stands in for the last call.
 */
export function dueReminder(s: ReminderSubject, plan: ReminderPlan, now: Date): ReminderKind | null {
  if (plan.off || !s.hasEmail) return null;
  if (s.status !== "scheduled" && s.status !== "in_progress") return null;
  if (!s.deadlineAt) return null;
  const t = now.getTime();
  const left = s.deadlineAt.getTime() - t;
  if (left <= 0) return null;

  if (plan.beforeDeadlineHours != null && !s.reminderSentAt && left <= plan.beforeDeadlineHours * HOUR) return "last_call";

  if (
    plan.startAfterHours != null &&
    !s.started &&
    s.status === "scheduled" &&
    !s.startReminderSentAt &&
    // A reminder sent by hand in the meantime already did the nudging.
    !s.reminderSentAt &&
    t - s.sentAt.getTime() >= plan.startAfterHours * HOUR
  ) {
    return "not_started";
  }
  return null;
}

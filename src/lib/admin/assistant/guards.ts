/**
 * Business rules for assistant proposals, checked twice: when the model
 * proposes (so it can correct itself) and again on approval (the admin may
 * have edited the card). Pure, so it is unit tested without a database.
 */
import { SWITCH_KEYS } from "@/lib/admin/switches";
import { AREA_KEYS } from "./maintenance-areas";
import type { ProposalKind } from "./types";

export const CREDIT_GRANT_MIN = 1;
export const CREDIT_GRANT_MAX = 1000;
export const TRIAL_EXTEND_MAX_DAYS = 60;
export const MAINTENANCE_MIN_MINUTES = 5;
export const MAINTENANCE_MAX_MINUTES = 24 * 60;

export const PROPOSAL_KINDS: ProposalKind[] = [
  "grant_credits",
  "extend_trial",
  "set_switch",
  "schedule_maintenance",
  "email_workspace_owner",
  "moderate_blog",
  "create_todo",
];

export const BLOG_ACTIONS = ["approve", "needs_changes", "reject"] as const;
export const BLOG_STATUS: Record<(typeof BLOG_ACTIONS)[number], string> = {
  approve: "PUBLISHED",
  needs_changes: "NEEDS_CHANGES",
  reject: "REJECTED",
};

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

/** Normalised args or the reason they are refused. */
export type GuardResult = { ok: true; args: Record<string, unknown> } | { ok: false; error: string };

function textField(v: unknown, label: string, max: number, required: boolean): string | { error: string } {
  const t = s(v);
  if (required && !t) return { error: `${label} is required` };
  if (t.length > max) return { error: `${label} must be ${max} characters or fewer` };
  return t;
}

function toInt(v: unknown): unknown {
  return typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : v;
}

export function checkProposal(kind: string, raw: Record<string, unknown>, now = new Date()): GuardResult {
  const a = { ...raw };
  const fail = (error: string): GuardResult => ({ ok: false, error });
  const text = (key: string, label: string, max: number, required: boolean) => {
    const r = textField(a[key], label, max, required);
    if (typeof r !== "string") return r.error;
    a[key] = r;
    return null;
  };
  let err: string | null;

  switch (kind) {
    case "grant_credits": {
      if (!s(a.workspaceId)) return fail("workspaceId is required");
      const amount = toInt(a.amount);
      if (!isInt(amount)) return fail("Amount must be a whole number of credits");
      if (amount < CREDIT_GRANT_MIN || amount > CREDIT_GRANT_MAX) {
        return fail(`Amount must be between ${CREDIT_GRANT_MIN} and ${CREDIT_GRANT_MAX} credits`);
      }
      a.amount = amount;
      if ((err = text("note", "A ledger note", 500, true))) return fail(err);
      a.emailOwner = a.emailOwner === true || a.emailOwner === "true";
      return { ok: true, args: a };
    }
    case "extend_trial": {
      if (!s(a.workspaceId)) return fail("workspaceId is required");
      const days = toInt(a.days);
      if (!isInt(days) || days < 1 || days > TRIAL_EXTEND_MAX_DAYS) return fail(`Days must be between 1 and ${TRIAL_EXTEND_MAX_DAYS}`);
      a.days = days;
      if ((err = text("note", "A note", 500, true))) return fail(err);
      return { ok: true, args: a };
    }
    case "set_switch": {
      if (!SWITCH_KEYS.includes(s(a.key))) return fail(`Unknown switch "${s(a.key)}"`);
      if (!["on", "read_only", "off"].includes(s(a.state))) return fail("State must be on, read_only or off");
      a.key = s(a.key);
      a.state = s(a.state);
      if ((err = text("message", "Message", 500, false))) return fail(err);
      if ((err = text("note", "A note", 500, true))) return fail(err);
      const resume = s(a.resumeAt);
      if (resume) {
        const t = Date.parse(resume);
        if (Number.isNaN(t)) return fail("resumeAt must be a date and time");
        if (t <= now.getTime()) return fail("resumeAt must be in the future");
        if (a.state === "on") return fail("resumeAt only applies when the switch is not on");
        a.resumeAt = new Date(t).toISOString();
      } else a.resumeAt = "";
      return { ok: true, args: a };
    }
    case "schedule_maintenance": {
      if (!AREA_KEYS.includes(s(a.area))) return fail(`Unknown area "${s(a.area)}". Use one of ${AREA_KEYS.join(", ")}`);
      a.area = s(a.area);
      const start = Date.parse(s(a.startsAt));
      if (Number.isNaN(start)) return fail("startsAt must be a date and time");
      if (start < now.getTime() - 5 * 60_000) return fail("startsAt is in the past");
      a.startsAt = new Date(start).toISOString();
      const minutes = toInt(a.minutes);
      if (!isInt(minutes) || minutes < MAINTENANCE_MIN_MINUTES || minutes > MAINTENANCE_MAX_MINUTES) {
        return fail(`Minutes must be between ${MAINTENANCE_MIN_MINUTES} and ${MAINTENANCE_MAX_MINUTES}`);
      }
      a.minutes = minutes;
      if ((err = text("message", "Message", 500, true))) return fail(err);
      return { ok: true, args: a };
    }
    case "email_workspace_owner": {
      if (!s(a.workspaceId)) return fail("workspaceId is required");
      if ((err = text("subject", "Subject", 150, true))) return fail(err);
      if ((err = text("body", "Body", 5000, true))) return fail(err);
      return { ok: true, args: a };
    }
    case "moderate_blog": {
      if (!s(a.postId)) return fail("postId is required");
      if (!(BLOG_ACTIONS as readonly string[]).includes(s(a.action))) return fail("Action must be approve, needs_changes or reject");
      a.action = s(a.action);
      if ((err = text("reason", "A reason", 2000, a.action !== "approve"))) return fail(err);
      return { ok: true, args: a };
    }
    case "create_todo": {
      if ((err = text("title", "Title", 200, true))) return fail(err);
      if ((err = text("detail", "Detail", 4000, false))) return fail(err);
      return { ok: true, args: a };
    }
    default:
      return fail(`Unknown proposal "${kind}"`);
  }
}

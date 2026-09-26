/**
 * The workspace events a webhook endpoint can subscribe to, plus the small
 * display helpers the Webhooks page uses. Pure: safe on client and server.
 */

export const WORKSPACE_EVENTS = [
  "screening.completed",
  "takehome.submitted",
  "interview.completed",
  "candidate.decided",
  "invite.bounced",
] as const;

export type WorkspaceEvent = (typeof WORKSPACE_EVENTS)[number];

/** Sent only by the "Send test" button. Never retried. */
export const TEST_EVENT = "webhook.test";

export const EVENT_DESCRIPTIONS: Record<WorkspaceEvent, string> = {
  "screening.completed": "An AI screening is finished and scored.",
  "takehome.submitted": "A candidate submits a take home.",
  "interview.completed": "An interviewer ends a live interview.",
  "candidate.decided": "A recruiter marks a candidate Passed or Not passed.",
  "invite.bounced": "An invite or reminder email to a candidate bounced.",
};

export function isWorkspaceEvent(v: unknown): v is WorkspaceEvent {
  return typeof v === "string" && (WORKSPACE_EVENTS as readonly string[]).includes(v);
}

/** Keeps known events only, in catalog order, without duplicates. */
export function cleanEventList(values: unknown): WorkspaceEvent[] {
  if (!Array.isArray(values)) return [];
  const set = new Set(values.filter(isWorkspaceEvent));
  return WORKSPACE_EVENTS.filter((e) => set.has(e));
}

/** "All events" when every event is on, otherwise a comma list. */
export function describeEventList(events: string[]): string {
  const clean = cleanEventList(events);
  if (clean.length === 0) return "No events";
  if (clean.length === WORKSPACE_EVENTS.length) return "All events";
  return clean.join(", ");
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/**
 * One short line for the delivery log, e.g. "Emma Clarke, Passed".
 * Reads the stored envelope ({ event, data: {...} }).
 */
export function summarizeDelivery(event: string, payload: unknown): string {
  const data = obj(obj(payload).data);
  const name = str(obj(data.candidate).name);
  switch (event) {
    case "candidate.decided": {
      const d = data.decision === "passed" ? "Passed" : data.decision === "not_passed" ? "Not passed" : null;
      return [name, d].filter(Boolean).join(", ") || "Decision recorded";
    }
    case "screening.completed":
      return [name, "AI screening"].filter(Boolean).join(", ");
    case "takehome.submitted":
      return [name, "take home"].filter(Boolean).join(", ");
    case "interview.completed":
      return [name, str(obj(data.interview).title) ?? "interview"].filter(Boolean).join(", ");
    case "invite.bounced":
      return str(obj(data.email).recipient) ?? "Email bounced";
    case TEST_EVENT:
      return "Test event";
    default:
      return "";
  }
}

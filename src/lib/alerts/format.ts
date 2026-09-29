/**
 * Slack and Microsoft Teams alert messages. Pure, so formatting is unit-tested
 * and the page can render a preview on the client.
 *
 * An alert is one short sentence plus a link. It reads the same envelope the
 * webhooks send ({ event, workspace, data }) but only ever uses the candidate
 * name, the kind of result and the report link. Answers, transcripts, code,
 * feedback and rejection reasons never leave Codepad. A score is added only
 * when the channel opts in, and only as a whole percentage.
 */
import { TEST_EVENT, WORKSPACE_EVENTS, type WorkspaceEvent } from "@/lib/events/catalog";

export const ALERT_PROVIDERS = ["slack", "teams"] as const;
export type AlertProvider = (typeof ALERT_PROVIDERS)[number];

export const PROVIDER_LABEL: Record<AlertProvider, string> = {
  slack: "Slack",
  teams: "Microsoft Teams",
};

export function isAlertProvider(v: unknown): v is AlertProvider {
  return v === "slack" || v === "teams";
}

/** Rows on the alerts page, in the order the board shows them. */
export const ALERT_EVENTS: { event: WorkspaceEvent; label: string; hint: string }[] = [
  { event: "takehome.submitted", label: "A take home is submitted", hint: "Goes to the review queue" },
  { event: "screening.completed", label: "An AI screening is ready for review", hint: "Graded and waiting for a decision" },
  { event: "interview.completed", label: "A live interview ends", hint: "When the interviewer closes the room" },
  { event: "invite.bounced", label: "An invite bounced", hint: "So you can fix the address or resend" },
  { event: "candidate.decided", label: "A candidate is passed or not passed", hint: "Useful for hiring managers" },
  { event: "round.waiting", label: "A round needs a next step or the next round is due", hint: "Once per round, so nobody waits unseen" },
];

/** What a new channel posts until someone changes it. */
export const DEFAULT_ALERT_EVENTS: WorkspaceEvent[] = ["takehome.submitted", "screening.completed", "candidate.decided"];

export function cleanAlertEvents(values: unknown): WorkspaceEvent[] {
  if (!Array.isArray(values)) return [];
  const set = new Set(values);
  return WORKSPACE_EVENTS.filter((e) => set.has(e));
}

export type AlertMessage = {
  /** One or two plain sentences. Also the notification fallback text. */
  text: string;
  linkUrl: string | null;
  linkLabel: string | null;
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** A whole percentage, or null when the value is not a usable 0 to 100 score. */
export function scorePercent(v: unknown): string | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(Math.min(100, Math.max(0, v)));
  return `${n}%`;
}

/** Candidate display name, trimmed and capped so a bad row cannot flood a channel. */
function nameOf(data: Json): string {
  const n = str(obj(data.candidate).name);
  if (!n) return "A candidate";
  return n.length > 80 ? `${n.slice(0, 79)}…` : n;
}

function capped(v: string | null, max = 120): string | null {
  if (!v) return null;
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

/**
 * Build the alert for one event envelope.
 *
 * @param envelope  the stored webhook envelope ({ event, workspace, data })
 * @param origin    app origin, used for links the envelope does not carry
 */
export function formatAlert(
  envelope: unknown,
  opts: { origin: string; includeScore?: boolean },
): AlertMessage {
  const env = obj(envelope);
  const event = str(env.event) ?? "";
  const data = obj(env.data);
  const ws = obj(env.workspace);
  const slug = str(ws.slug);
  const origin = opts.origin.replace(/\/+$/, "");
  const wsUrl = (path: string) => (slug ? `${origin}/w/${slug}/${path}` : null);
  const reportUrl = str(data.reportUrl);
  const name = nameOf(data);
  const withScore = (s: string, score: unknown) => {
    const pct = opts.includeScore ? scorePercent(score) : null;
    return pct ? `${s} Score: ${pct}.` : s;
  };

  switch (event) {
    case "screening.completed": {
      const s = obj(data.screening);
      const role = capped(str(s.positionTitle));
      const text = role
        ? `${name} finished the AI screening for ${role}. It is ready for review.`
        : `${name} finished an AI screening. It is ready for review.`;
      return { text: withScore(text, s.score), linkUrl: reportUrl, linkLabel: "Open report" };
    }
    case "takehome.submitted": {
      const t = obj(data.takeHome);
      const title = capped(str(t.title));
      const text = title
        ? `${name} submitted the take home ${title}. It is in the review queue.`
        : `${name} submitted a take home. It is in the review queue.`;
      return { text: withScore(text, t.score), linkUrl: reportUrl, linkLabel: "Open submission" };
    }
    case "interview.completed": {
      const title = capped(str(obj(data.interview).title));
      const text = title ? `The interview ${title} with ${name} has ended.` : `The interview with ${name} has ended.`;
      return { text, linkUrl: reportUrl, linkLabel: "Open report" };
    }
    case "candidate.decided": {
      const decision = data.decision === "passed" ? "Passed" : data.decision === "not_passed" ? "Not passed" : null;
      let text = decision ? `${name} was marked ${decision}.` : `A decision was recorded for ${name}.`;
      if (decision === "Passed" && str(data.manualOverride)) text += " This was a manual override.";
      return { text, linkUrl: reportUrl, linkLabel: "Open candidate" };
    }
    case "round.waiting": {
      const r = obj(data.round);
      const round = capped(str(r.name), 80) ?? "a round";
      const text =
        data.waiting === "next_round"
          ? `${name} moved on and ${round} is not ${r.kind === "interview" ? "booked" : "sent"} yet.`
          : `${name} finished ${round}${str(data.result) ? ` (${capped(str(data.result), 40)})` : ""}. Move them on or stop here.`;
      return { text, linkUrl: reportUrl, linkLabel: "Open candidate" };
    }
    case "invite.bounced": {
      const recipient = capped(str(obj(data.email).recipient), 120);
      const text = recipient
        ? `An email to ${recipient} bounced. Fix the address or resend it.`
        : "A candidate email bounced. Fix the address or resend it.";
      return { text, linkUrl: wsUrl("emails"), linkLabel: "Open email activity" };
    }
    case TEST_EVENT: {
      const wsName = capped(str(ws.name), 80) ?? "your workspace";
      return {
        text: `This is a test from Codepad. Alerts for ${wsName} will post here.`,
        linkUrl: wsUrl("alerts"),
        linkLabel: "Open alert settings",
      };
    }
    default:
      return { text: `Something happened in Codepad: ${event || "unknown event"}.`, linkUrl: null, linkLabel: null };
  }
}

/** Slack mrkdwn needs &, < and > escaped; everything else is literal. */
export function escapeSlack(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Body for a Slack incoming webhook (Block Kit with a plain text fallback). */
export function slackBody(msg: AlertMessage): Record<string, unknown> {
  const text = escapeSlack(msg.text);
  const blocks: Record<string, unknown>[] = [{ type: "section", text: { type: "mrkdwn", text } }];
  if (msg.linkUrl && msg.linkLabel) {
    blocks.push({
      type: "actions",
      elements: [{ type: "button", text: { type: "plain_text", text: msg.linkLabel }, url: msg.linkUrl }],
    });
  }
  return { text, blocks, unfurl_links: false, unfurl_media: false };
}

/** Body for a Teams incoming webhook or Workflows URL: a message with one adaptive card. */
export function teamsBody(msg: AlertMessage): Record<string, unknown> {
  const card: Record<string, unknown> = {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.4",
    body: [
      { type: "TextBlock", text: "Codepad", weight: "Bolder", size: "Small", isSubtle: true },
      // Plain text: Teams would otherwise read * and _ in a name as markdown.
      { type: "RichTextBlock", inlines: [{ type: "TextRun", text: msg.text }] },
    ],
  };
  if (msg.linkUrl && msg.linkLabel) {
    card.actions = [{ type: "Action.OpenUrl", title: msg.linkLabel, url: msg.linkUrl }];
  }
  return {
    type: "message",
    summary: msg.text,
    attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", contentUrl: null, content: card }],
  };
}

export function bodyFor(provider: AlertProvider, msg: AlertMessage): Record<string, unknown> {
  return provider === "slack" ? slackBody(msg) : teamsBody(msg);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Destination URLs
 * ────────────────────────────────────────────────────────────────────────── */

const TEAMS_HOSTS = [/\.webhook\.office\.com$/, /\.logic\.azure\.com$/, /\.powerplatform\.com$/, /\.powerautomate\.com$/];

/**
 * Checks a pasted incoming webhook URL. Only the providers' own hosts are
 * accepted, which also keeps these requests away from internal addresses.
 */
export function validateAlertUrl(
  provider: AlertProvider,
  raw: string,
): { ok: true; url: string } | { ok: false; error: string } {
  const value = raw.trim();
  const which = provider === "slack" ? "Slack incoming webhook" : "Teams webhook or workflow";
  if (!value) return { ok: false, error: `Paste the ${which} URL.` };
  if (value.length > 2000) return { ok: false, error: "That URL is too long." };
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return { ok: false, error: "That is not a valid URL." };
  }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) {
    return { ok: false, error: "Use the https:// URL exactly as the app gave it to you." };
  }
  const host = u.hostname.toLowerCase();
  if (provider === "slack") {
    if (host !== "hooks.slack.com" || !u.pathname.startsWith("/services/")) {
      return { ok: false, error: "Slack incoming webhook URLs start with https://hooks.slack.com/services/." };
    }
  } else if (!TEAMS_HOSTS.some((re) => re.test(host))) {
    return {
      ok: false,
      error: "Use a Teams incoming webhook (webhook.office.com) or a Workflows URL (logic.azure.com or powerplatform.com).",
    };
  }
  u.hash = "";
  return { ok: true, url: u.toString() };
}

/** "hooks.slack.com/…/AbCd" style label so the full secret URL is never shown back. */
export function maskedUrl(url: string): string {
  try {
    const u = new URL(url);
    const tail = u.pathname.split("/").filter(Boolean).pop() ?? "";
    return `${u.hostname}/…${tail.slice(-4)}`;
  } catch {
    return "saved URL";
  }
}

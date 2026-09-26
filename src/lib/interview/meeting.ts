/**
 * The video call for a live interview is a link to the team's own meeting
 * tool (Zoom, Google Meet, Teams, ...). The room shows it as a Join call
 * button; Interviewpad does not carry audio or video itself.
 */

export const MAX_MEETING_URL = 500;

const PROVIDERS: { test: RegExp; name: string }[] = [
  { test: /(^|\.)zoom\.(us|com)$|(^|\.)zoomgov\.com$/, name: "Zoom" },
  { test: /^meet\.google\.com$/, name: "Google Meet" },
  { test: /(^|\.)teams\.(microsoft|live)\.com$/, name: "Microsoft Teams" },
  { test: /(^|\.)webex\.com$/, name: "Webex" },
  { test: /(^|\.)whereby\.com$/, name: "Whereby" },
  { test: /^meet\.jit\.si$/, name: "Jitsi" },
  { test: /(^|\.)chime\.aws$/, name: "Amazon Chime" },
  { test: /(^|\.)around\.co$/, name: "Around" },
  { test: /(^|\.)slack\.com$/, name: "Slack huddle" },
];

/**
 * Cleans a pasted meeting link. Returns the link to store, null for an empty
 * value, or an error message. Only https links are accepted, so a pasted
 * `javascript:` or plain-http link never ends up behind the Join button.
 */
export function cleanMeetingUrl(raw: string | null | undefined): { ok: true; url: string | null } | { ok: false; error: string } {
  const v = (raw ?? "").trim();
  if (!v) return { ok: true, url: null };
  if (v.length > MAX_MEETING_URL) return { ok: false, error: "That link is too long." };
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
  } catch {
    return { ok: false, error: "That does not look like a link." };
  }
  if (u.protocol !== "https:") return { ok: false, error: "Use an https link." };
  if (!u.hostname.includes(".") || u.username || u.password) return { ok: false, error: "That does not look like a meeting link." };
  return { ok: true, url: u.toString() };
}

/** "Zoom", "Google Meet" and so on, or null when the host is not a known tool. */
export function meetingProvider(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return PROVIDERS.find((p) => p.test.test(host))?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Google Calendar and Microsoft 365 (Graph) behind one small interface:
 * OAuth URLs, code exchange, token refresh, free and busy lookup, and
 * creating, moving and cancelling the interview event.
 *
 * Everything here takes `fetch` as a parameter so the unit tests can mock
 * it. No database access: see ./server.ts for the Prisma side.
 */

export type CalendarProvider = "google" | "microsoft";
export const CALENDAR_PROVIDERS: CalendarProvider[] = ["google", "microsoft"];
export const isCalendarProvider = (v: unknown): v is CalendarProvider => v === "google" || v === "microsoft";

export const PROVIDER_LABEL: Record<CalendarProvider, string> = { google: "Google", microsoft: "Outlook" };

type Fetch = typeof fetch;

export type ProviderConfig = { clientId: string; clientSecret: string; tenant: string };

/** OAuth app credentials from env, or null when the provider is not set up. */
export function providerConfig(p: CalendarProvider, env: Record<string, string | undefined> = process.env): ProviderConfig | null {
  const id = p === "google" ? env.GOOGLE_CALENDAR_CLIENT_ID : env.MS_CALENDAR_CLIENT_ID;
  const secret = p === "google" ? env.GOOGLE_CALENDAR_CLIENT_SECRET : env.MS_CALENDAR_CLIENT_SECRET;
  if (!id || !secret) return null;
  return { clientId: id, clientSecret: secret, tenant: (p === "microsoft" && env.MS_CALENDAR_TENANT) || "common" };
}

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar.events",
];
export const MICROSOFT_SCOPES = ["openid", "email", "offline_access", "User.Read", "Calendars.ReadWrite"];

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_API = "https://www.googleapis.com/calendar/v3";
const msLogin = (tenant: string) => `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0`;
const GRAPH = "https://graph.microsoft.com/v1.0";

export function authorizeUrl(p: CalendarProvider, cfg: ProviderConfig, redirectUri: string, state: string, loginHint?: string | null): string {
  const q = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    scope: (p === "google" ? GOOGLE_SCOPES : MICROSOFT_SCOPES).join(" "),
  });
  if (p === "google") {
    // Offline + consent so Google always returns a refresh token.
    q.set("access_type", "offline");
    q.set("prompt", "consent");
    q.set("include_granted_scopes", "true");
  } else {
    q.set("response_mode", "query");
    q.set("prompt", "select_account");
  }
  if (loginHint) q.set("login_hint", loginHint);
  return `${p === "google" ? GOOGLE_AUTH : `${msLogin(cfg.tenant)}/authorize`}?${q}`;
}

export type TokenSet = {
  accessToken: string;
  /** Null when the provider did not send a new one (keep the old one). */
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string;
};

export class CalendarAuthError extends Error {
  /** True when the grant is gone (revoked, expired): the member must reconnect. */
  constructor(message: string, readonly revoked: boolean) {
    super(message);
  }
}

async function tokenRequest(p: CalendarProvider, cfg: ProviderConfig, body: Record<string, string>, f: Fetch, now: Date): Promise<TokenSet> {
  const url = p === "google" ? GOOGLE_TOKEN : `${msLogin(cfg.tenant)}/token`;
  const params = new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...body });
  if (p === "microsoft") params.set("scope", MICROSOFT_SCOPES.join(" "));
  const res = await f(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: params.toString() });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || typeof json.access_token !== "string") {
    const code = typeof json.error === "string" ? json.error : `http_${res.status}`;
    throw new CalendarAuthError(`Token request failed (${code}).`, code === "invalid_grant" || code === "unauthorized_client" || code === "interaction_required");
  }
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : Number(json.expires_in);
  return {
    accessToken: json.access_token,
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : null,
    expiresAt: Number.isFinite(expiresIn) && expiresIn > 0 ? new Date(now.getTime() + expiresIn * 1000) : null,
    scopes: typeof json.scope === "string" ? json.scope : "",
  };
}

export function exchangeCode(p: CalendarProvider, cfg: ProviderConfig, code: string, redirectUri: string, f: Fetch = fetch, now = new Date()) {
  return tokenRequest(p, cfg, { grant_type: "authorization_code", code, redirect_uri: redirectUri }, f, now);
}

export function refreshAccessToken(p: CalendarProvider, cfg: ProviderConfig, refreshToken: string, f: Fetch = fetch, now = new Date()) {
  return tokenRequest(p, cfg, { grant_type: "refresh_token", refresh_token: refreshToken }, f, now);
}

/** Tokens are refreshed this long before they expire. */
export const REFRESH_MARGIN_MS = 2 * 60_000;

export type StoredTokens = { accessToken: string; refreshToken: string | null; expiresAt: Date | null };

/**
 * A usable access token: the stored one while it has time left, otherwise a
 * refreshed one. `save` is called with the new tokens so the caller can
 * persist them (the old refresh token is kept when none comes back).
 */
export async function freshAccessToken(
  p: CalendarProvider,
  cfg: ProviderConfig,
  stored: StoredTokens,
  save: (t: StoredTokens & { scopes: string }) => Promise<void>,
  f: Fetch = fetch,
  now = new Date(),
): Promise<string> {
  if (stored.expiresAt && stored.expiresAt.getTime() - REFRESH_MARGIN_MS > now.getTime()) return stored.accessToken;
  if (!stored.refreshToken) {
    if (!stored.expiresAt) return stored.accessToken;
    throw new CalendarAuthError("The calendar access expired and there is no refresh token.", true);
  }
  const t = await refreshAccessToken(p, cfg, stored.refreshToken, f, now);
  const next = { accessToken: t.accessToken, refreshToken: t.refreshToken ?? stored.refreshToken, expiresAt: t.expiresAt, scopes: t.scopes };
  await save(next);
  return next.accessToken;
}

/** The calendar account's email address. */
export async function fetchAccountEmail(p: CalendarProvider, accessToken: string, f: Fetch = fetch): Promise<string | null> {
  const res = await f(p === "google" ? GOOGLE_USERINFO : `${GRAPH}/me?$select=mail,userPrincipalName`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const email = p === "google" ? j.email : (j.mail ?? j.userPrincipalName);
  return typeof email === "string" && email ? email.toLowerCase() : null;
}

/* ───────────────────────── Free and busy ───────────────────────── */

export type BusyBlock = { start: string; end: string };

/** Graph returns "2026-09-28T09:00:00.0000000" plus a separate zone; we ask for UTC. */
function graphUtc(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const { dateTime, timeZone } = v as { dateTime?: unknown; timeZone?: unknown };
  if (typeof dateTime !== "string") return null;
  const zone = typeof timeZone === "string" ? timeZone.toUpperCase() : "UTC";
  const iso = /[zZ]|[+-]\d\d:\d\d$/.test(dateTime) || (zone !== "UTC" && zone !== "Z") ? dateTime : `${dateTime}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function cleanBlocks(raw: { start: string | null; end: string | null }[]): BusyBlock[] {
  return raw
    .filter((b): b is BusyBlock => !!b.start && !!b.end && b.end > b.start)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Busy blocks from a Google `freeBusy` response for the primary calendar. */
export function parseGoogleFreeBusy(json: unknown): BusyBlock[] {
  const cal = (json as { calendars?: Record<string, { busy?: { start?: unknown; end?: unknown }[]; errors?: unknown[] }> })?.calendars?.primary;
  if (!cal) throw new Error("Google did not return the primary calendar.");
  if (Array.isArray(cal.errors) && cal.errors.length) throw new Error("Google could not read the calendar.");
  const iso = (v: unknown) => {
    if (typeof v !== "string") return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  return cleanBlocks((cal.busy ?? []).map((b) => ({ start: iso(b.start), end: iso(b.end) })));
}

/** Statuses that block a slot. Free and "working elsewhere" do not. */
const GRAPH_BUSY = new Set(["busy", "oof", "tentative"]);

/** Busy blocks from a Graph `getSchedule` response (first schedule). */
export function parseGraphSchedule(json: unknown): BusyBlock[] {
  const first = (json as { value?: { scheduleItems?: { status?: unknown; start?: unknown; end?: unknown }[]; error?: unknown }[] })?.value?.[0];
  if (!first) throw new Error("Outlook did not return a schedule.");
  if (first.error) throw new Error("Outlook could not read the calendar.");
  return cleanBlocks(
    (first.scheduleItems ?? [])
      .filter((i) => typeof i.status === "string" && GRAPH_BUSY.has(i.status.toLowerCase()))
      .map((i) => ({ start: graphUtc(i.start), end: graphUtc(i.end) })),
  );
}

export async function fetchBusy(
  p: CalendarProvider,
  accessToken: string,
  account: string,
  from: Date,
  to: Date,
  f: Fetch = fetch,
): Promise<BusyBlock[]> {
  const auth = { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
  if (p === "google") {
    const res = await f(`${GOOGLE_API}/freeBusy`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: "primary" }] }),
    });
    if (res.status === 401) throw new CalendarAuthError("Google refused the token.", false);
    if (!res.ok) throw new Error(`Google free/busy failed (${res.status}).`);
    return parseGoogleFreeBusy(await res.json());
  }
  const utc = (d: Date) => ({ dateTime: d.toISOString().replace(/Z$/, ""), timeZone: "UTC" });
  const res = await f(`${GRAPH}/me/calendar/getSchedule`, {
    method: "POST",
    headers: { ...auth, prefer: 'outlook.timezone="UTC"' },
    body: JSON.stringify({ schedules: [account], startTime: utc(from), endTime: utc(to), availabilityViewInterval: 30 }),
  });
  if (res.status === 401) throw new CalendarAuthError("Microsoft refused the token.", false);
  if (!res.ok) throw new Error(`Outlook schedule failed (${res.status}).`);
  return parseGraphSchedule(await res.json());
}

/* ───────────────────────── Events ───────────────────────── */

export type InterviewEvent = {
  title: string;
  start: Date;
  end: Date;
  /** Shown as the location: the video call link, else the room link. */
  location: string;
  description: string;
  attendees: { email: string; name?: string | null }[];
};

function googleEventBody(e: InterviewEvent) {
  return {
    summary: e.title,
    description: e.description,
    location: e.location,
    start: { dateTime: e.start.toISOString() },
    end: { dateTime: e.end.toISOString() },
    attendees: e.attendees.map((a) => ({ email: a.email, ...(a.name ? { displayName: a.name } : {}) })),
    reminders: { useDefault: true },
  };
}

function graphEventBody(e: InterviewEvent) {
  const utc = (d: Date) => ({ dateTime: d.toISOString().replace(/Z$/, ""), timeZone: "UTC" });
  return {
    subject: e.title,
    body: { contentType: "text", content: e.description },
    start: utc(e.start),
    end: utc(e.end),
    location: { displayName: e.location },
    attendees: e.attendees.map((a) => ({ emailAddress: { address: a.email, ...(a.name ? { name: a.name } : {}) }, type: "required" })),
  };
}

async function expectOk(res: Response, what: string) {
  if (res.status === 401) throw new CalendarAuthError(`${what}: the token was refused.`, false);
  if (!res.ok) throw new Error(`${what} failed (${res.status}).`);
}

/** Creates the event on the organiser's primary calendar and returns its id. */
export async function createEvent(p: CalendarProvider, accessToken: string, e: InterviewEvent, f: Fetch = fetch): Promise<string> {
  const headers = { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
  const res =
    p === "google"
      ? await f(`${GOOGLE_API}/calendars/primary/events?sendUpdates=all`, { method: "POST", headers, body: JSON.stringify(googleEventBody(e)) })
      : await f(`${GRAPH}/me/events`, { method: "POST", headers, body: JSON.stringify(graphEventBody(e)) });
  await expectOk(res, "Creating the event");
  const j = (await res.json().catch(() => ({}))) as { id?: unknown };
  if (typeof j.id !== "string" || !j.id) throw new Error("The calendar did not return an event id.");
  return j.id;
}

export async function updateEvent(p: CalendarProvider, accessToken: string, id: string, e: InterviewEvent, f: Fetch = fetch): Promise<void> {
  const headers = { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
  const res =
    p === "google"
      ? await f(`${GOOGLE_API}/calendars/primary/events/${encodeURIComponent(id)}?sendUpdates=all`, { method: "PATCH", headers, body: JSON.stringify(googleEventBody(e)) })
      : await f(`${GRAPH}/me/events/${encodeURIComponent(id)}`, { method: "PATCH", headers, body: JSON.stringify(graphEventBody(e)) });
  await expectOk(res, "Updating the event");
}

/** Cancels the event and tells attendees. An event that is already gone counts as cancelled. */
export async function cancelEvent(p: CalendarProvider, accessToken: string, id: string, f: Fetch = fetch): Promise<void> {
  const headers = { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
  const res =
    p === "google"
      ? await f(`${GOOGLE_API}/calendars/primary/events/${encodeURIComponent(id)}?sendUpdates=all`, { method: "DELETE", headers })
      : await f(`${GRAPH}/me/events/${encodeURIComponent(id)}/cancel`, { method: "POST", headers, body: JSON.stringify({ comment: "This interview was cancelled." }) });
  if (res.status === 404 || res.status === 410) return;
  // Graph only cancels meetings that have attendees; delete anything else.
  if (p === "microsoft" && res.status === 400) {
    const del = await f(`${GRAPH}/me/events/${encodeURIComponent(id)}`, { method: "DELETE", headers });
    if (del.status === 404) return;
    return expectOk(del, "Deleting the event");
  }
  await expectOk(res, "Cancelling the event");
}

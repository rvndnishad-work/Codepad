/**
 * "Add to Slack" install flow. Needs SLACK_CLIENT_ID and SLACK_CLIENT_SECRET;
 * without them the page offers the paste-a-webhook option only.
 *
 * We ask for the `incoming-webhook` scope only. Slack then shows its own
 * channel picker during install and hands back a webhook URL for that
 * channel, so posting works the same way as a pasted webhook.
 *
 * The state parameter is an HMAC-signed, short-lived token naming the
 * workspace and the person who started the install.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const SLACK_SCOPES = ["incoming-webhook"];
export const SLACK_CALLBACK_PATH = "/api/integrations/slack/callback";
const STATE_TTL_MS = 10 * 60_000;

export function slackOAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!(env.SLACK_CLIENT_ID?.trim() && env.SLACK_CLIENT_SECRET?.trim());
}

function stateSecret(env: NodeJS.ProcessEnv = process.env): string {
  const s = env.AUTH_SECRET || env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set, so the Slack install cannot be signed.");
  return s;
}

export type SlackState = { workspaceId: string; slug: string; userId: string; exp: number };

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

function sign(body: string, secret: string): string {
  return createHmac("sha256", `slack-install:${secret}`).update(body).digest("base64url");
}

export function createSlackState(
  input: Omit<SlackState, "exp">,
  opts: { secret?: string; now?: number } = {},
): string {
  const secret = opts.secret ?? stateSecret();
  const payload: SlackState & { n: string } = {
    ...input,
    exp: (opts.now ?? Date.now()) + STATE_TTL_MS,
    n: randomBytes(8).toString("hex"),
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

export function verifySlackState(state: string | null | undefined, opts: { secret?: string; now?: number } = {}): SlackState | null {
  if (!state || state.length > 2000) return null;
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  let secret: string;
  try {
    secret = opts.secret ?? stateSecret();
  } catch {
    return null;
  }
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<SlackState>;
    if (typeof p.workspaceId !== "string" || typeof p.slug !== "string" || typeof p.userId !== "string") return null;
    if (typeof p.exp !== "number" || p.exp < (opts.now ?? Date.now())) return null;
    return { workspaceId: p.workspaceId, slug: p.slug, userId: p.userId, exp: p.exp };
  } catch {
    return null;
  }
}

export function slackAuthorizeUrl(params: { clientId: string; redirectUri: string; state: string }): string {
  const u = new URL("https://slack.com/oauth/v2/authorize");
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("scope", SLACK_SCOPES.join(","));
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("state", params.state);
  return u.toString();
}

export type SlackInstall = {
  webhookUrl: string;
  channel: string;
  channelId: string | null;
  teamName: string | null;
  accessToken: string | null;
};

/** Trade the install code for a webhook URL and bot token. */
export async function exchangeSlackCode(
  params: { code: string; redirectUri: string; clientId: string; clientSecret: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; install: SlackInstall } | { ok: false; error: string }> {
  let json: Record<string, unknown>;
  try {
    const res = await fetchImpl("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: params.code,
        redirect_uri: params.redirectUri,
        client_id: params.clientId,
        client_secret: params.clientSecret,
      }).toString(),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "Could not reach Slack. Try again." };
  }
  if (json.ok !== true) {
    return { ok: false, error: `Slack said: ${typeof json.error === "string" ? json.error : "unknown error"}` };
  }
  const hook = (json.incoming_webhook ?? {}) as Record<string, unknown>;
  const team = (json.team ?? {}) as Record<string, unknown>;
  if (typeof hook.url !== "string" || !hook.url) {
    return { ok: false, error: "Slack did not return a channel. Pick a channel during the install." };
  }
  return {
    ok: true,
    install: {
      webhookUrl: hook.url,
      channel: typeof hook.channel === "string" && hook.channel ? hook.channel : "Slack channel",
      channelId: typeof hook.channel_id === "string" ? hook.channel_id : null,
      teamName: typeof team.name === "string" ? team.name : null,
      accessToken: typeof json.access_token === "string" ? json.access_token : null,
    },
  };
}

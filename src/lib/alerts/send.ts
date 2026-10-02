/**
 * Posts alerts to Slack and Teams. Server only.
 *
 * The event bus (src/lib/events/emit.ts) calls notifyAlertChannels() with the
 * same envelope it sends to webhooks. Alerts are best effort: one try, the
 * result is kept on the channel (lastSentAt / lastError) and shown on the
 * alerts page. They never throw into the code that raised the event.
 */
import { prisma } from "@/lib/prisma";
import { isFeatureOn } from "@/lib/admin/switches";
import { decryptAtRest } from "@/lib/crypto/at-rest";
import { bodyFor, formatAlert, isAlertProvider, validateAlertUrl, type AlertMessage, type AlertProvider } from "./format";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ERROR_CHARS = 300;

export type PostResult = { ok: boolean; status: number | null; error: string | null };

/** One POST to a provider URL. Redirects are not followed. */
export async function postAlert(
  provider: AlertProvider,
  url: string,
  msg: AlertMessage,
  fetchImpl: typeof fetch = fetch,
): Promise<PostResult> {
  // Re-checked on every send: only the providers' own hosts are ever called.
  const checked = validateAlertUrl(provider, url);
  if (!checked.ok) return { ok: false, status: null, error: checked.error };
  try {
    const res = await fetchImpl(checked.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Codepad-Alerts/1.0" },
      body: JSON.stringify(bodyFor(provider, msg)),
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.status >= 200 && res.status < 300) return { ok: true, status: res.status, error: null };
    const text = (await res.text().catch(() => "")).trim();
    return { ok: false, status: res.status, error: describeFailure(provider, res.status, text) };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    const msgText =
      name === "TimeoutError" || name === "AbortError"
        ? `No response within ${REQUEST_TIMEOUT_MS / 1000} seconds.`
        : "Could not reach the service.";
    return { ok: false, status: null, error: msgText };
  }
}

/** Short, human reason for a failed post. */
export function describeFailure(provider: AlertProvider, status: number, body: string): string {
  const b = body.slice(0, MAX_ERROR_CHARS);
  if (provider === "slack") {
    if (b === "no_service" || status === 404) return "Slack no longer knows this webhook. It may have been removed. Connect the channel again.";
    if (b === "channel_is_archived") return "The Slack channel is archived.";
    if (b === "action_prohibited") return "A Slack admin has blocked posts to this channel.";
    if (b === "invalid_token" || b === "invalid_payload") return `Slack rejected the message (${b}).`;
  } else if (status === 404 || status === 410) {
    return "Teams no longer knows this webhook. It may have been removed. Connect the channel again.";
  }
  return `HTTP ${status}${b ? `: ${b}` : ""}`;
}

type ChannelRow = { id: string; provider: string; url: string; includeScore: boolean };

async function sendToChannel(ch: ChannelRow, envelope: unknown, origin: string): Promise<PostResult> {
  if (!isAlertProvider(ch.provider)) return { ok: false, status: null, error: "Unknown provider." };
  let url: string;
  try {
    url = decryptAtRest(ch.url);
  } catch (err) {
    console.error("[alerts] could not decrypt channel url:", err);
    return { ok: false, status: null, error: "Could not read the saved URL on our side." };
  }
  const msg = formatAlert(envelope, { origin, includeScore: ch.includeScore });
  const result = await postAlert(ch.provider, url, msg);
  await prisma.alertChannel
    .update({
      where: { id: ch.id },
      data: result.ok
        ? { lastSentAt: new Date(), lastError: null, lastErrorAt: null }
        : { lastError: result.error, lastErrorAt: new Date() },
    })
    .catch(() => undefined);
  return result;
}

/** Post one event to every active channel in the workspace that wants it. */
export async function notifyAlertChannels(workspaceId: string, event: string, envelope: unknown, origin: string): Promise<void> {
  if (!(await isFeatureOn("chat-notifications"))) return; // paused from admin: skip silently
  const channels = await prisma.alertChannel.findMany({
    where: { workspaceId, active: true, events: { has: event } },
    select: { id: true, provider: true, url: true, includeScore: true },
  });
  for (const ch of channels) {
    await sendToChannel(ch, envelope, origin).catch((err) => console.error(`[alerts] send to ${ch.id} failed:`, err));
  }
}

/** Does this workspace have any active channel for the event? Cheap pre-check for the bus. */
export async function hasAlertChannels(workspaceId: string, event: string): Promise<boolean> {
  const n = await prisma.alertChannel.count({ where: { workspaceId, active: true, events: { has: event } } });
  return n > 0;
}

/** Send the test message to one channel (the page's "Send a test" button). */
export async function sendTestAlert(channel: ChannelRow, envelope: unknown, origin: string): Promise<PostResult> {
  return sendToChannel(channel, envelope, origin);
}

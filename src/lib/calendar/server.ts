/**
 * Database side of the calendar connections: token refresh with
 * persistence, free and busy for workspace members, and keeping the
 * interview event on the organiser's calendar in step with the interview.
 * Server only.
 */
import { prisma } from "@/lib/prisma";
import { decryptAtRest, encryptAtRest } from "@/lib/crypto/at-rest";
import { appOrigin } from "@/lib/interview/links";
import {
  CalendarAuthError,
  cancelEvent,
  createEvent,
  fetchBusy,
  freshAccessToken,
  isCalendarProvider,
  providerConfig,
  updateEvent,
  type BusyBlock,
  type CalendarProvider,
  type InterviewEvent,
} from "./providers";

export type ConnectionRow = {
  id: string;
  userId: string;
  provider: string;
  email: string;
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  expiresAt: Date | null;
  status: string;
};

const CONNECTION_SELECT = { id: true, userId: true, provider: true, email: true, accessTokenEnc: true, refreshTokenEnc: true, expiresAt: true, status: true } as const;

export function calendarProvidersConfigured(): Record<CalendarProvider, boolean> {
  return { google: !!providerConfig("google"), microsoft: !!providerConfig("microsoft") };
}

/** Access token for a connection, refreshed and saved when it is about to expire. */
export async function connectionAccessToken(c: ConnectionRow): Promise<{ provider: CalendarProvider; token: string }> {
  if (!isCalendarProvider(c.provider)) throw new Error("Unknown calendar provider.");
  const cfg = providerConfig(c.provider);
  if (!cfg) throw new Error("This calendar provider is not configured.");
  try {
    const token = await freshAccessToken(
      c.provider,
      cfg,
      { accessToken: decryptAtRest(c.accessTokenEnc), refreshToken: c.refreshTokenEnc ? decryptAtRest(c.refreshTokenEnc) : null, expiresAt: c.expiresAt },
      async (t) => {
        await prisma.calendarConnection.update({
          where: { id: c.id },
          data: {
            accessTokenEnc: encryptAtRest(t.accessToken),
            refreshTokenEnc: t.refreshToken ? encryptAtRest(t.refreshToken) : null,
            expiresAt: t.expiresAt,
            ...(t.scopes ? { scopes: t.scopes } : {}),
            status: "active",
            lastError: null,
          },
        });
      },
    );
    return { provider: c.provider, token };
  } catch (err) {
    if (err instanceof CalendarAuthError && err.revoked) {
      await prisma.calendarConnection
        .update({ where: { id: c.id }, data: { status: "expired", lastError: "Access was revoked or expired. Reconnect the calendar." } })
        .catch(() => null);
    }
    throw err;
  }
}

export type MemberBusy = {
  userId: string;
  /** "none": no calendar connected. "expired": needs reconnecting. "error": could not read it just now. */
  status: "connected" | "none" | "expired" | "error";
  provider: CalendarProvider | null;
  busy: BusyBlock[];
};

/** Longest range the wizard may ask about in one go. */
export const MAX_BUSY_RANGE_MS = 15 * 24 * 3600_000;

export async function busyForMembers(workspaceId: string, userIds: string[], from: Date, to: Date): Promise<MemberBusy[]> {
  const conns = await prisma.calendarConnection.findMany({ where: { workspaceId, userId: { in: userIds } }, select: CONNECTION_SELECT });
  return Promise.all(
    userIds.map(async (userId): Promise<MemberBusy> => {
      const c = conns.find((x) => x.userId === userId);
      if (!c) return { userId, status: "none", provider: null, busy: [] };
      const provider = isCalendarProvider(c.provider) ? c.provider : null;
      if (c.status === "expired") return { userId, status: "expired", provider, busy: [] };
      try {
        const { provider: p, token } = await connectionAccessToken(c);
        const busy = await fetchBusy(p, token, c.email, from, to);
        return { userId, status: "connected", provider: p, busy };
      } catch (err) {
        const expired = err instanceof CalendarAuthError && err.revoked;
        if (!expired) console.error("[calendar] busy lookup failed:", err instanceof Error ? err.message : err);
        return { userId, status: expired ? "expired" : "error", provider, busy: [] };
      }
    }),
  );
}

/* ───────────────────────── Interview events ───────────────────────── */

const SESSION_SELECT = {
  id: true,
  title: true,
  candidateName: true,
  scheduledAt: true,
  totalSec: true,
  meetingUrl: true,
  userId: true,
  panelJson: true,
  workspaceId: true,
  status: true,
  guests: { select: { email: true } },
  calendarEvent: { select: { id: true, externalId: true, connection: { select: CONNECTION_SELECT } } },
} as const;

function panelIds(raw: string | null): string[] {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

type SessionRow = NonNullable<Awaited<ReturnType<typeof loadSession>>>;
const loadSession = (id: string) => prisma.interviewSession.findUnique({ where: { id }, select: SESSION_SELECT });

async function eventFor(s: SessionRow & { scheduledAt: Date; workspaceId: string }, organiser: ConnectionRow): Promise<InterviewEvent> {
  const origin = await appOrigin();
  const room = `${origin}/interview/${s.id}`;
  const interviewers = [s.userId, ...panelIds(s.panelJson)];
  const [users, conns] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: interviewers } }, select: { id: true, name: true, email: true } }),
    prisma.calendarConnection.findMany({ where: { workspaceId: s.workspaceId, userId: { in: interviewers } }, select: { userId: true, email: true } }),
  ]);
  const seen = new Set([organiser.email.toLowerCase()]);
  const attendees: InterviewEvent["attendees"] = [];
  const add = (email: string | null | undefined, name?: string | null) => {
    const e = email?.trim().toLowerCase();
    if (!e || seen.has(e)) return;
    seen.add(e);
    attendees.push({ email: e, name: name ?? null });
  };
  for (const id of interviewers) {
    if (id === organiser.userId) continue;
    const u = users.find((x) => x.id === id);
    add(conns.find((c) => c.userId === id)?.email ?? u?.email, u?.name);
  }
  for (const g of s.guests) add(g.email);
  const who = s.candidateName ? ` with ${s.candidateName}` : "";
  return {
    title: `${s.title}${who}`,
    start: s.scheduledAt,
    end: new Date(s.scheduledAt.getTime() + s.totalSec * 1000),
    location: s.meetingUrl || room,
    description: [
      `Interview${who}.`,
      `Interview room: ${room}`,
      s.meetingUrl ? `Video call: ${s.meetingUrl}` : null,
      "Interviewers sign in to open the room. The candidate has their own link by email.",
    ]
      .filter(Boolean)
      .join("\n"),
    attendees,
  };
}

export type EventSync = { status: "created" | "updated" | "cancelled" | "skipped" | "failed"; reason?: string };

/**
 * Creates or updates the interview's calendar event. A new event goes on the
 * calendar of the first organiser in `organiserIds` who has one connected.
 * Without a time the existing event is cancelled. Never throws.
 */
export async function syncInterviewEvent(sessionId: string, opts: { organiserIds?: string[] } = {}): Promise<EventSync> {
  try {
    const s = await loadSession(sessionId);
    if (!s || !s.workspaceId) return { status: "skipped", reason: "not a workspace interview" };
    const existing = s.calendarEvent;
    if (!s.scheduledAt || s.status === "abandoned") {
      if (existing) return cancelInterviewEvent(sessionId);
      return { status: "skipped", reason: "no time" };
    }
    const timed = { ...s, scheduledAt: s.scheduledAt, workspaceId: s.workspaceId };
    if (existing) {
      const { provider, token } = await connectionAccessToken(existing.connection);
      await updateEvent(provider, token, existing.externalId, await eventFor(timed, existing.connection));
      await prisma.interviewCalendarEvent.update({ where: { id: existing.id }, data: { updatedAt: new Date() } });
      return { status: "updated" };
    }
    const ids = opts.organiserIds ?? [];
    if (!ids.length) return { status: "skipped", reason: "no event" };
    const conns = await prisma.calendarConnection.findMany({ where: { workspaceId: s.workspaceId, userId: { in: ids }, status: "active" }, select: CONNECTION_SELECT });
    const organiser = ids.map((id) => conns.find((c) => c.userId === id)).find((c): c is ConnectionRow => !!c);
    if (!organiser) return { status: "skipped", reason: "no connected calendar" };
    const { provider, token } = await connectionAccessToken(organiser);
    const externalId = await createEvent(provider, token, await eventFor(timed, organiser));
    await prisma.interviewCalendarEvent.create({ data: { sessionId: s.id, connectionId: organiser.id, externalId } });
    return { status: "created" };
  } catch (err) {
    console.error("[calendar] event sync failed:", err instanceof Error ? err.message : err);
    return { status: "failed", reason: err instanceof Error ? err.message : "unknown" };
  }
}

/** Cancels the interview's calendar event, if it has one, and forgets it. Never throws. */
export async function cancelInterviewEvent(sessionId: string): Promise<EventSync> {
  try {
    const ev = await prisma.interviewCalendarEvent.findUnique({ where: { sessionId }, select: { id: true, externalId: true, connection: { select: CONNECTION_SELECT } } });
    if (!ev) return { status: "skipped", reason: "no event" };
    const { provider, token } = await connectionAccessToken(ev.connection);
    await cancelEvent(provider, token, ev.externalId);
    await prisma.interviewCalendarEvent.delete({ where: { id: ev.id } }).catch(() => null);
    return { status: "cancelled" };
  } catch (err) {
    console.error("[calendar] event cancel failed:", err instanceof Error ? err.message : err);
    return { status: "failed", reason: err instanceof Error ? err.message : "unknown" };
  }
}

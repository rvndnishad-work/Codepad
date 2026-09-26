/**
 * Interviewers invited by email (not workspace members). Each gets a private
 * token per room; `?guest=<token>` on the room URL and its API calls gives
 * them the interviewer side of that room, the same as the host and panel.
 * Server only.
 */
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { BatchOutcome } from "@/lib/email";
import { guestJoinUrl } from "./links";
import { formatOf, isEmail, normalizeGuests } from "./wizard";

export function newGuestToken(): string {
  return randomBytes(18).toString("base64url");
}

/** The guest a token belongs to, if it is for this room. */
export async function guestFor(sessionId: string, token: string | null | undefined): Promise<{ id: string; email: string } | null> {
  if (!token || token.length < 16 || token.length > 64) return null;
  const g = await prisma.interviewGuest.findUnique({ where: { token }, select: { id: true, email: true, sessionId: true } });
  return g && g.sessionId === sessionId ? { id: g.id, email: g.email } : null;
}

/** Reads `?guest=` from a request and checks it against the room. */
export async function guestFromRequest(req: Request, sessionId: string): Promise<{ id: string; email: string } | null> {
  return guestFor(sessionId, new URL(req.url).searchParams.get("guest"));
}

type Room = { id: string; candidateName: string | null; scheduledAt: Date | null };

/** How one email went, for the wizard's last page. */
export type DeliveryStatus = { to: string; status: "sent" | "not-configured" | "failed" | "suppressed"; reason?: string };

export function deliveryOf(to: string, o: BatchOutcome | undefined): DeliveryStatus {
  if (!o) return { to, status: "failed", reason: "not sent" };
  if (o.status === "sent") return o.provider === "console" ? { to, status: "not-configured" } : { to, status: "sent" };
  return { to, status: o.status, reason: o.reason };
}

/**
 * Adds the guests to every room and emails each one the details, one email
 * per person listing all rooms, in a single batch request. Someone already
 * on a room keeps their link. Never throws: failures come back per address.
 */
export async function inviteGuests(a: {
  workspaceId: string;
  emails: string[];
  rooms: Room[];
  title: string;
  format: string | null;
  minutes: number;
  hostName: string;
  inviterName: string;
  brief: string | null;
  origin: string;
}): Promise<DeliveryStatus[]> {
  const emails = normalizeGuests(a.emails).filter(isEmail);
  if (!emails.length || !a.rooms.length) return [];
  try {
    const ws = await prisma.workspace.findUnique({ where: { id: a.workspaceId }, select: { name: true, slug: true } });
    const { guestRoomPath } = await import("./room-server");
    // Signed, expiring links into the workspace room (the older link only if
    // the workspace is somehow gone).
    const sessions = await prisma.interviewSession.findMany({ where: { id: { in: a.rooms.map((r) => r.id) } }, select: { id: true, shareToken: true, scheduledAt: true, totalSec: true } });
    const byId = new Map(sessions.map((x) => [x.id, x]));
    const linkFor = (roomId: string, token: string, guestId: string) => {
      const s = byId.get(roomId);
      return ws && s ? `${a.origin}${guestRoomPath(s, ws.slug, guestId)}` : guestJoinUrl(a.origin, roomId, token);
    };
    const perGuest: { email: string; links: { room: Room; token: string; guestId: string }[] }[] = [];
    for (const email of emails) {
      const links: { room: Room; token: string; guestId: string }[] = [];
      for (const room of a.rooms) {
        const g = await prisma.interviewGuest.upsert({
          where: { sessionId_email: { sessionId: room.id, email } },
          create: { sessionId: room.id, email, token: newGuestToken() },
          update: {},
          select: { id: true, token: true },
        });
        links.push({ room, token: g.token, guestId: g.id });
      }
      perGuest.push({ email, links });
    }
    const { sendTemplatedBatch } = await import("@/lib/email");
    const res = await sendTemplatedBatch(
      "interviewer-invite",
      perGuest.map(({ email, links }) => ({
        to: email,
        props: {
          workspaceName: ws?.name ?? "the team",
          inviterName: a.inviterName,
          title: a.title,
          formatLabel: formatOf(a.format)?.label ?? "Live interview",
          durationMin: a.minutes,
          hostName: a.hostName,
          brief: a.brief,
          rooms: links.map((l) => ({
            candidateName: l.room.candidateName || "Candidate to be confirmed",
            scheduledAt: l.room.scheduledAt ? l.room.scheduledAt.toISOString() : null,
            joinUrl: linkFor(l.room.id, l.token, l.guestId),
          })),
        },
        workspaceId: a.workspaceId,
        sessionId: links[0]?.room.id,
      })),
    );
    const out = perGuest.map((g, i) => deliveryOf(g.email, res.outcomes?.[i]));
    const sentIds = perGuest.flatMap((g, i) => (out[i].status === "sent" ? g.links.map((l) => l.guestId) : []));
    if (sentIds.length) await prisma.interviewGuest.updateMany({ where: { id: { in: sentIds } }, data: { sentAt: new Date() } });
    return out;
  } catch (err) {
    console.error("[interviewer-invite] failed:", err);
    return emails.map((to) => ({ to, status: "failed", reason: "Something went wrong while sending." }));
  }
}

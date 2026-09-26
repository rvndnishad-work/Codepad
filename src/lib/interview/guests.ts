/**
 * Interviewers invited by email (not workspace members). Each gets a private
 * token per room; `?guest=<token>` on the room URL and its API calls gives
 * them the interviewer side of that room, the same as the host and panel.
 * Server only.
 */
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
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

/**
 * Adds the guests to every room and emails each one the details, one email
 * per person listing all rooms. Someone already on a room keeps their link.
 * Fire-and-forget safe: errors are logged, never thrown.
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
}): Promise<{ sent: number }> {
  const emails = normalizeGuests(a.emails).filter(isEmail);
  if (!emails.length || !a.rooms.length) return { sent: 0 };
  let sent = 0;
  try {
    const ws = await prisma.workspace.findUnique({ where: { id: a.workspaceId }, select: { name: true } });
    const { sendEmail } = await import("@/lib/email");
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
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
      const res = await sendEmail({
        template: "interviewer-invite",
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
            joinUrl: `${baseUrl}/interview/${l.room.id}?guest=${l.token}`,
          })),
        },
        workspaceId: a.workspaceId,
        sessionId: a.rooms[0].id,
        idempotencyKey: `interviewer-invite:${createHash("sha256").update(links.map((l) => l.guestId).join(",")).digest("hex").slice(0, 32)}`,
      });
      if (res.sent) {
        sent++;
        await prisma.interviewGuest.updateMany({ where: { id: { in: links.map((l) => l.guestId) } }, data: { sentAt: new Date() } });
      } else {
        console.warn(`[interviewer-invite] ${email}: ${res.reason}`);
      }
    }
  } catch (err) {
    console.error("[interviewer-invite] failed:", err);
  }
  return { sent };
}

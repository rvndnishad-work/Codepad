/**
 * Who is opening a live interview room, and as which side. One place for
 * every way in: a signed-in host, panel member or workspace admin; a room
 * pass cookie (candidate, or an interviewer HR emailed); and the older
 * share-token and `?guest=` links, which keep working for the classic room.
 * Server only.
 */
import { prisma } from "@/lib/prisma";
import { WORKSPACE_ADMIN_ROLES } from "@/lib/totp-gate";
import { toolRole } from "./tools";
import { guestFor } from "./guests";
import { parsePanel } from "./wizard";
import { cookieFrom, roomCookieName, verifyRoomPass } from "./room-pass";

export type RoomRole = "interviewer" | "candidate";

export type RoomViewer = {
  role: RoomRole;
  /** Display name other people in the room see. Decided here, never by the client. */
  name: string;
  via: "member" | "pass" | "token" | "guest";
  userId: string | null;
  guestId: string | null;
  /** Emailed interviewers: their address, for the audit trail. */
  guestEmail?: string | null;
};

export type RoomSubject = {
  id: string;
  userId: string;
  panelJson: string | null;
  creatorRole: string;
  shareToken: string;
  createdById?: string | null;
  workspaceId: string | null;
  candidateName: string | null;
  status: string;
};

export const ROOM_SELECT = {
  id: true,
  userId: true,
  panelJson: true,
  creatorRole: true,
  shareToken: true,
  createdById: true,
  workspaceId: true,
  candidateName: true,
  status: true,
} as const;

function firstName(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

/** Signed-in people who get the interviewer side: host, panel, whoever set it
 * up, and workspace owners and admins. */
async function memberRole(s: RoomSubject, userId: string): Promise<boolean> {
  if (s.userId === userId || parsePanel(s.panelJson).includes(userId) || s.createdById === userId) return true;
  if (!s.workspaceId) return false;
  const m = await prisma.workspaceMember.findFirst({ where: { workspaceId: s.workspaceId, userId }, select: { role: true } });
  return !!m && (WORKSPACE_ADMIN_ROLES as readonly string[]).includes(m.role);
}

export async function roomViewer(
  s: RoomSubject,
  a: {
    user?: { id: string; name?: string | null; email?: string | null } | null;
    cookieHeader?: string | null;
    /** Legacy share token (`?token=`). */
    token?: string | null;
    /** Legacy emailed interviewer key (`?guest=`). */
    guestKey?: string | null;
    /** False: only members and room passes (the workspace room's own pages). */
    legacy?: boolean;
  },
): Promise<RoomViewer | null> {
  const user = a.user ?? null;
  if (user?.id && s.creatorRole === "interviewer" && (await memberRole(s, user.id))) {
    return { role: "interviewer", name: firstName(user.name) ?? firstName(user.email?.split("@")[0]) ?? "Interviewer", via: "member", userId: user.id, guestId: null };
  }

  const raw = cookieFrom(a.cookieHeader, roomCookieName(s.id));
  if (raw) {
    const check = verifyRoomPass(raw, s);
    if (check.ok) {
      if (check.pass.r === "candidate") {
        return { role: "candidate", name: firstName(s.candidateName) ?? "Candidate", via: "pass", userId: user?.id ?? null, guestId: null };
      }
      const g = await prisma.interviewGuest.findUnique({ where: { id: check.pass.g! }, select: { id: true, email: true, sessionId: true } });
      if (g && g.sessionId === s.id) return { role: "interviewer", name: g.email.split("@")[0], via: "pass", userId: null, guestId: g.id, guestEmail: g.email };
    }
  }

  if (a.legacy === false) return null;
  const guest = a.guestKey && s.creatorRole === "interviewer" ? await guestFor(s.id, a.guestKey) : null;
  const role = toolRole(s, user?.id, a.token, !!guest);
  if (!role) return null;
  if (guest) return { role, name: guest.email.split("@")[0], via: "guest", userId: null, guestId: guest.id, guestEmail: guest.email };
  if (role === "candidate") return { role, name: firstName(s.candidateName) ?? "Candidate", via: a.token ? "token" : "member", userId: user?.id ?? null, guestId: null };
  return { role, name: firstName(user?.name) ?? "Interviewer", via: a.token ? "token" : "member", userId: user?.id ?? null, guestId: null };
}

/** Reads the viewer from an API request (cookie, `?token=`, `?guest=`). */
export async function roomViewerFromRequest(
  req: Request,
  s: RoomSubject,
  user: { id: string; name?: string | null; email?: string | null } | null,
): Promise<RoomViewer | null> {
  const sp = new URL(req.url).searchParams;
  return roomViewer(s, { user, cookieHeader: req.headers.get("cookie"), token: sp.get("token"), guestKey: sp.get("guest") });
}

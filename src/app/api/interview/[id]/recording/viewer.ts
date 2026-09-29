/**
 * Who is asking, for the recording routes: the same room access as the
 * video token route (members, room pass cookie, share token, guest key).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roomViewerFromRequest, ROOM_SELECT, type RoomViewer } from "@/lib/interview/room-access";

export const NO_STORE = { "Cache-Control": "no-store" };

export async function recordingViewer(req: Request, id: string): Promise<{ viewer: RoomViewer } | { res: NextResponse }> {
  const [session, s] = await Promise.all([
    auth().catch(() => null),
    prisma.interviewSession.findUnique({ where: { id }, select: { ...ROOM_SELECT, type: true } }),
  ]);
  if (!s || s.type !== "live" || !s.workspaceId) return { res: NextResponse.json({ error: "This interview no longer exists." }, { status: 404 }) };
  const user = session?.user?.id ? { id: session.user.id, name: session.user.name, email: session.user.email } : null;
  const viewer = await roomViewerFromRequest(req, s, user);
  if (!viewer) return { res: NextResponse.json({ error: "Open the interview from your link first." }, { status: 401 }) };
  return { viewer };
}

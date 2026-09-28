/**
 * Recording the built-in call of a live interview.
 *
 * GET    -> { recording, startedAt, canStart?, reason? }
 * POST   -> starts recording (interviewers only)
 * DELETE -> stops recording (interviewers only)
 *
 * Same room access as the video token route. Everyone in the room may ask
 * whether the call is being recorded, so the candidate's "Recording" label
 * still shows when LiveKit does not say; only interviewers learn why Record
 * would not work, and only they can start or stop it.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roomViewerFromRequest, ROOM_SELECT, type RoomViewer } from "@/lib/interview/room-access";
import { roomRecordingState, startLiveRecording, stopLiveRecording } from "@/lib/recording/live-server";

const NO_STORE = { "Cache-Control": "no-store" };

async function viewerFor(req: Request, id: string): Promise<{ viewer: RoomViewer } | { res: NextResponse }> {
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

function interviewerOnly(viewer: RoomViewer): NextResponse | null {
  return viewer.role === "interviewer" ? null : NextResponse.json({ error: "Only interviewers can start or stop recording." }, { status: 403 });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await viewerFor(req, id);
  if ("res" in v) return v.res;
  const state = await roomRecordingState(id, v.viewer.role === "interviewer");
  return NextResponse.json(state, { headers: NO_STORE });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await viewerFor(req, id);
  if ("res" in v) return v.res;
  const denied = interviewerOnly(v.viewer);
  if (denied) return denied;

  const res = await startLiveRecording({ sessionId: id, actorUserId: v.viewer.userId, actorEmail: v.viewer.guestEmail ?? null });
  if (!res.ok) {
    const status = res.code === "missing" ? 404 : res.code === "egress_failed" ? 502 : res.code === "already" ? 409 : 403;
    return NextResponse.json({ error: res.error, code: res.code }, { status, headers: NO_STORE });
  }
  return NextResponse.json(await roomRecordingState(id, true), { headers: NO_STORE });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await viewerFor(req, id);
  if ("res" in v) return v.res;
  const denied = interviewerOnly(v.viewer);
  if (denied) return denied;

  await stopLiveRecording({ sessionId: id, actorUserId: v.viewer.userId, actorEmail: v.viewer.guestEmail ?? null });
  return NextResponse.json(await roomRecordingState(id, true), { headers: NO_STORE });
}

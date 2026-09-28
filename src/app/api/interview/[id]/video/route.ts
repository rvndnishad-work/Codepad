/**
 * Built-in video: a LiveKit join token for one person in one interview.
 *
 * POST -> { url, token, room }
 *
 * Same room access as the tools relay (room pass cookie, signed-in member,
 * legacy links). Refused unless the workspace has the video add-on on, this
 * interview uses built-in video, it has not ended, and LiveKit is set up.
 * The token names the interview's room only and lasts four hours.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roomViewerFromRequest, ROOM_SELECT } from "@/lib/interview/room-access";
import { videoCallsOn } from "@/lib/video/addon";
import { liveKitConfig, videoJoinToken, videoRoomName } from "@/lib/video/livekit-server";
import { videoIdentity, videoJoinRefusal } from "@/lib/video/room-video";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, s] = await Promise.all([
    auth().catch(() => null),
    prisma.interviewSession.findUnique({
      where: { id },
      select: {
        ...ROOM_SELECT,
        type: true,
        builtinVideo: true,
        workspace: { select: { planName: true, trialEndsAt: true, stripeSubscriptionId: true, videoEnabled: true } },
      },
    }),
  ]);
  if (!s || s.type === "take-home") return NextResponse.json({ error: "This interview no longer exists." }, { status: 404 });

  const user = session?.user?.id ? { id: session.user.id, name: session.user.name, email: session.user.email } : null;
  const viewer = await roomViewerFromRequest(req, s, user);
  if (!viewer) return NextResponse.json({ error: "Open the interview from your link to join the call." }, { status: 401 });

  const cfg = liveKitConfig();
  const refusal = videoJoinRefusal({
    addonOn: !!s.workspace && videoCallsOn(s.workspace),
    builtinVideo: s.builtinVideo,
    status: s.status,
    liveKitReady: !!cfg,
  });
  if (refusal || !cfg) return NextResponse.json({ error: refusal ?? "Video is not set up yet." }, { status: 403 });

  const room = videoRoomName(s.id);
  const token = await videoJoinToken(cfg, {
    room,
    identity: videoIdentity(viewer, s.id),
    name: viewer.name,
    metadata: { role: viewer.role },
  });
  return NextResponse.json({ url: cfg.url, token, room }, { headers: { "Cache-Control": "no-store" } });
}

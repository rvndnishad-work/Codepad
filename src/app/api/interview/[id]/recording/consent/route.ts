/**
 * Recording consent asked in the room.
 *
 * POST { action: "ask" }                 interviewers: ask the candidate to be recorded
 * POST { action: "allow" | "decline" }   the candidate answers
 *
 * Same room access as the recording route (the room pass cookie for the
 * candidate). Returns the caller's recording state, like GET ../ does.
 */
import { NextResponse } from "next/server";
import { answerRecordingConsent, askRecordingConsent, roomRecordingState } from "@/lib/recording/live-server";
import { NO_STORE, recordingViewer } from "../viewer";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await recordingViewer(req, id);
  if ("res" in v) return v.res;
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  const action = body?.action;

  if (action === "ask") {
    if (v.viewer.role !== "interviewer") return NextResponse.json({ error: "Only interviewers can ask to record." }, { status: 403, headers: NO_STORE });
    const res = await askRecordingConsent({ sessionId: id, actorUserId: v.viewer.userId, actorEmail: v.viewer.guestEmail ?? null, askedBy: v.viewer.name });
    if (!res.ok) return NextResponse.json({ error: res.error, code: res.code }, { status: res.code === "missing" ? 404 : 409, headers: NO_STORE });
    return NextResponse.json(await roomRecordingState(id, true), { headers: NO_STORE });
  }

  if (action === "allow" || action === "decline") {
    if (v.viewer.role !== "candidate") return NextResponse.json({ error: "Only the candidate answers this." }, { status: 403, headers: NO_STORE });
    const res = await answerRecordingConsent({ sessionId: id, allow: action === "allow" });
    if (!res.ok) return NextResponse.json({ error: res.error, code: res.code }, { status: 404, headers: NO_STORE });
    return NextResponse.json(await roomRecordingState(id, false), { headers: NO_STORE });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400, headers: NO_STORE });
}

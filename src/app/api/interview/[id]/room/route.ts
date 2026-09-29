/**
 * Workspace interview room controls, interviewers only.
 *
 * PATCH { type: "start" }             start the clock (server time)
 * PATCH { type: "round", round }      put a round on the shared stage, or
 *                                     clear it (null)
 *
 * Ending goes through PATCH /api/interview/[id] with status "completed",
 * which also saves the verdict, scorecard and the code from the room.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roomViewerFromRequest, ROOM_SELECT } from "@/lib/interview/room-access";
import { parseRound } from "@/lib/interview/room";

const schema = z.union([
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("round"), round: z.string().max(100).nullable() }),
]);

function ids(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, s] = await Promise.all([
    auth().catch(() => null),
    prisma.interviewSession.findUnique({
      where: { id },
      select: { ...ROOM_SELECT, type: true, challengeIds: true, playgroundIds: true, promptScenarioIds: true, startedAt: true },
    }),
  ]);
  if (!s || s.type !== "live") return NextResponse.json({ error: "not found" }, { status: 404 });
  const viewer = await roomViewerFromRequest(req, s, session?.user?.id ? { id: session.user.id, name: session.user.name, email: session.user.email } : null);
  if (viewer?.role !== "interviewer") return NextResponse.json({ error: "Only interviewers can do that." }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const a = parsed.data;

  if (a.type === "start") {
    if (s.status === "in_progress") return NextResponse.json({ status: s.status, startedAt: s.startedAt?.toISOString() ?? null });
    if (s.status !== "scheduled") return NextResponse.json({ error: "This interview has ended." }, { status: 409 });
    const now = new Date();
    await prisma.interviewSession.updateMany({ where: { id, status: "scheduled" }, data: { status: "in_progress", startedAt: now, startRequestedAt: null } });
    const fresh = await prisma.interviewSession.findUnique({ where: { id }, select: { status: true, startedAt: true } });
    return NextResponse.json({ status: fresh?.status, startedAt: fresh?.startedAt?.toISOString() ?? null });
  }

  // round
  if (s.status !== "in_progress") return NextResponse.json({ error: "Start the interview first." }, { status: 409 });
  if (a.round !== null) {
    const r = parseRound(a.round);
    const allowed =
      !!r &&
      ((r.kind === "challenge" && ids(s.challengeIds).includes(r.id)) ||
        (r.kind === "playground" && ids(s.playgroundIds).includes(r.id)) ||
        (r.kind === "prompt" && ids(s.promptScenarioIds).includes(r.id)));
    if (!allowed) return NextResponse.json({ error: "That round is not part of this interview." }, { status: 400 });
    if (r!.kind === "challenge") {
      const steps = await prisma.challengeStep.count({ where: { challengeId: r!.id } });
      if (r!.step >= Math.max(1, steps)) return NextResponse.json({ error: "No such step." }, { status: 400 });
    }
  }
  await prisma.interviewSession.update({ where: { id }, data: { roomRound: a.round, ...(a.round?.startsWith("c:") ? { activeChallengeId: a.round.split(":")[1] } : {}) } });
  return NextResponse.json({ round: a.round });
}

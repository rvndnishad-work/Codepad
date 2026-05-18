import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["scheduled", "in_progress", "completed", "abandoned"]).optional(),
  startedAt: z.string().datetime().nullable().optional(),
  finishedAt: z.string().datetime().nullable().optional(),
  verdict: z.enum(["success", "failed", "left_in_between", "suspicious"]).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  // Guest-only: candidate requesting the interviewer to start the session.
  startRequested: z.boolean().optional(),
});

// GET — lightweight polling endpoint so guests can detect when session starts
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const existing = await prisma.interviewSession.findUnique({
    where: { id },
    select: { status: true, startRequestedAt: true, shareToken: true },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Allow owner (any logged-in user matching) or valid token holder
  const session = await auth().catch(() => null);
  const isValidToken = !!token && token === existing.shareToken;
  const isOwner = !!session?.user?.id;
  if (!isOwner && !isValidToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: existing.status,
    startRequested: !!existing.startRequestedAt,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const existing = await prisma.interviewSession.findUnique({
    where: { id },
    select: { userId: true, shareToken: true, creatorRole: true },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isOwner = existing.userId === session.user.id;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const hasShareToken = !!token && token === existing.shareToken;

  // Resolve dynamic interviewer role
  let isInterviewer = false;
  if (existing.creatorRole === "interviewer") {
    isInterviewer = isOwner;
  } else {
    isInterviewer = isOwner ? false : hasShareToken;
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // startRequested can be set by anyone in the session (owner or token holder)
  if (parsed.data.startRequested !== undefined) {
    await prisma.interviewSession.update({
      where: { id },
      data: { startRequestedAt: parsed.data.startRequested ? new Date() : null },
    });
    return NextResponse.json({ success: true });
  }

  // All other fields (status, notes, verdict etc.) require being the Interviewer
  if (!isInterviewer) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const data: Record<string, any> = {};
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.startedAt !== undefined)
    data.startedAt = parsed.data.startedAt ? new Date(parsed.data.startedAt) : null;
  if (parsed.data.finishedAt !== undefined)
    data.finishedAt = parsed.data.finishedAt ? new Date(parsed.data.finishedAt) : null;
  if (parsed.data.verdict !== undefined) data.verdict = parsed.data.verdict;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;

  const updated = await prisma.interviewSession.update({
    where: { id },
    data,
    select: { id: true, status: true, verdict: true, notes: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const existing = await prisma.interviewSession.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.interviewSession.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

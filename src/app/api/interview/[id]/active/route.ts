import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  challengeId: z.string().min(1),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const interview = await prisma.interviewSession.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!interview) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Only the session owner can set the active challenge.
  if (interview.userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.interviewSession.update({
    where: { id },
    data: {
      activeChallengeId: parsed.data.challengeId,
    },
  });

  return NextResponse.json({ success: true });
}

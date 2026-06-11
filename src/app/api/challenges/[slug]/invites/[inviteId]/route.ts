import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string; inviteId: string }> };

// DELETE /api/challenges/[slug]/invites/[inviteId]
// Soft-revoke: marks status="revoked" so the magic-link token stops working
// but the row remains for audit. Author or admin only.
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { slug, inviteId } = await params;

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true, authorId: true },
  });
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }
  if (challenge.authorId !== userId && !(await staffCan(session, "content:curate"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const inv = await prisma.challengeInvitation.update({
      where: { id: inviteId },
      data: { status: "revoked" },
      select: { id: true, status: true },
    });
    return NextResponse.json(inv);
  } catch (err) {
    console.error("Challenge invite revoke error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

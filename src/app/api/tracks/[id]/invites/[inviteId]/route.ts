import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; inviteId: string }> };

// DELETE /api/tracks/[id]/invites/[inviteId]
// Revoke: marks the invitation status="revoked" rather than hard-deleting,
// so the magic-link token becomes useless but the row remains for audit.
// Author or admin only.
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { id, inviteId } = await params;

  const track = await prisma.challengeTrack.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }
  if (track.authorId !== userId && !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const inv = await prisma.trackInvitation.update({
      where: { id: inviteId },
      data: { status: "revoked" },
      select: { id: true, status: true },
    });
    return NextResponse.json(inv);
  } catch (err) {
    console.error("Invite revoke error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

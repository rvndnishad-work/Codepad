import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: targetId } = await params;
  if (targetId === session.user.id) {
    return NextResponse.json({ error: "cannot follow yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Idempotent: re-following is a no-op.
  await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: targetId,
      },
    },
    create: {
      followerId: session.user.id,
      followingId: targetId,
    },
    update: {},
  });

  return NextResponse.json({ following: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: targetId } = await params;

  // Delete is idempotent — missing row is fine.
  await prisma.follow
    .delete({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: targetId,
        },
      },
    })
    .catch(() => null);

  return NextResponse.json({ following: false });
}

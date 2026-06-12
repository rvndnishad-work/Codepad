import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const comment = await prisma.blogComment.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!comment) return NextResponse.json({ error: "not found" }, { status: 404 });

  const allowed =
    comment.userId === session.user.id ||
    (await staffCan(session, "comment:moderate"));
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.blogComment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

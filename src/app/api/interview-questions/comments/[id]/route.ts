import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { staffCan } from "@/lib/permissions/staff";

type Ctx = { params: Promise<{ id: string }> };

/** Delete a question comment. Allowed for the comment author or a moderator. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const comment = await prisma.prepQuestionComment.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!comment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const isOwner = comment.userId === session.user.id;
  const isMod = isOwner || (await staffCan(session, "content:moderate"));
  if (!isMod) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.prepQuestionComment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

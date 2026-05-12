import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, published: true },
  });
  if (!post || !post.published) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.blogBookmark
    .upsert({
      where: { postId_userId: { postId: id, userId: session.user.id } },
      create: { postId: id, userId: session.user.id },
      update: {},
    })
    .catch(() => null);

  return NextResponse.json({ bookmarked: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  await prisma.blogBookmark
    .delete({
      where: { postId_userId: { postId: id, userId: session.user.id } },
    })
    .catch(() => null);

  return NextResponse.json({ bookmarked: false });
}

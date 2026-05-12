import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().min(1).max(40).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, published: true },
  });
  if (!post || !post.published) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // If parentId supplied, ensure it belongs to this post.
  if (parsed.data.parentId) {
    const parent = await prisma.blogComment.findUnique({
      where: { id: parsed.data.parentId },
      select: { postId: true },
    });
    if (!parent || parent.postId !== id) {
      return NextResponse.json({ error: "bad parent" }, { status: 400 });
    }
  }

  const comment = await prisma.blogComment.create({
    data: {
      postId: id,
      userId: session.user.id,
      content: parsed.data.content,
      parentId: parsed.data.parentId,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}

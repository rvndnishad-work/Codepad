import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = ["clap", "heart", "fire", "unicorn"] as const;
const bodySchema = z.object({
  type: z.enum(ALLOWED_TYPES).default("clap"),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
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

  await prisma.blogReaction.upsert({
    where: {
      postId_userId_type: {
        postId: id,
        userId: session.user.id,
        type: parsed.data.type,
      },
    },
    create: { postId: id, userId: session.user.id, type: parsed.data.type },
    update: {},
  });

  const count = await prisma.blogReaction.count({
    where: { postId: id, type: parsed.data.type },
  });
  return NextResponse.json({ reacted: true, count });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "clap";
  if (!(ALLOWED_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: "bad type" }, { status: 400 });
  }

  await prisma.blogReaction
    .delete({
      where: {
        postId_userId_type: { postId: id, userId: session.user.id, type },
      },
    })
    .catch(() => null);

  const count = await prisma.blogReaction.count({
    where: { postId: id, type },
  });
  return NextResponse.json({ reacted: false, count });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TAG_RE = /^[a-z0-9][a-z0-9-]{0,29}$/;

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(500).optional(),
  coverImage: z
    .string()
    .url()
    .refine((u) => /^https?:/.test(u), "must be http(s) URL")
    .optional()
    .or(z.literal("")),
  published: z.boolean().optional(),
  tags: z.array(z.string().regex(TAG_RE)).max(8).optional(),
});

async function requireOwner(id: string, userId: string) {
  const blog = await prisma.blogPost.findUnique({ where: { id } });
  if (!blog) return { error: "not found", status: 404 as const };
  if (blog.userId !== userId) return { error: "forbidden", status: 403 as const };
  return { blog };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const blog = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });
  
  if (!blog) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!blog.published) {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== blog.userId) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  }

  return NextResponse.json(blog);
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

  const guard = await requireOwner(id, session.user.id);
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // tags need JSON encoding for SQLite; everything else passes through.
  const { tags, ...rest } = parsed.data;
  const data = {
    ...rest,
    ...(tags !== undefined ? { tags: tags.length > 0 ? JSON.stringify(tags) : null } : {}),
  };

  try {
    const updated = await prisma.blogPost.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating blog post:", error);
    return NextResponse.json({ error: "failed to update blog post" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const guard = await requireOwner(id, session.user.id);
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    return NextResponse.json({ error: "failed to delete blog post" }, { status: 500 });
  }
}

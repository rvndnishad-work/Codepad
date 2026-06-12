import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { coverImageSchema, blogTagsSchema } from "@/lib/blog-schema";
import { can, getGlobalSubject } from "@/lib/permissions";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(500).optional(),
  coverImage: coverImageSchema.optional(),
  published: z.boolean().optional(),
  tags: blogTagsSchema.optional(),
});

// Owner OR a content:moderate holder may mutate a post — resolved through the
// engine's ownership rule + moderation override (src/lib/permissions).
async function requireOwner(
  id: string,
  userId: string,
  action: "blogpost:write" | "blogpost:delete" = "blogpost:write",
) {
  const blog = await prisma.blogPost.findUnique({ where: { id } });
  if (!blog) return { error: "not found", status: 404 as const };
  const subject = await getGlobalSubject(userId);
  const ok = can(subject, action, { contentType: "BLOG_POST", userId: blog.userId });
  if (!ok) return { error: "forbidden", status: 403 as const };
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

  const guard = await requireOwner(id, session.user.id, "blogpost:write");
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

  const guard = await requireOwner(id, session.user.id, "blogpost:delete");
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

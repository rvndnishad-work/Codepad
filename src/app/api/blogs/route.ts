import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { coverImageSchema, blogTagsSchema } from "@/lib/blog-schema";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  coverImage: coverImageSchema.optional(),
  published: z.boolean().optional(),
  tags: blogTagsSchema.optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const slug = `${parsed.data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${nanoid(6)}`;

  try {
    const blog = await prisma.blogPost.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        excerpt: parsed.data.excerpt,
        coverImage: parsed.data.coverImage,
        published: parsed.data.published ?? false,
        tags: parsed.data.tags ? JSON.stringify(parsed.data.tags) : null,
        slug,
        userId: session.user.id,
      },
    });
    return NextResponse.json(blog);
  } catch (error) {
    console.error("Error creating blog post:", error);
    return NextResponse.json({ error: "failed to create blog post" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeDrafts = searchParams.get("published") === "false";
  const userId = searchParams.get("userId");
  const tag = searchParams.get("tag")?.trim().toLowerCase() || null;
  const excludeFeatured = searchParams.get("excludeFeatured") === "true";

  // Cursor pagination — `before` is the createdAt ISO of the last item the
  // client already has; `limit` caps the batch size. Used by the homepage
  // horizontal scroller and the /blog "More stories" list for lazy-loading.
  const beforeRaw = searchParams.get("before");
  const limitRaw = searchParams.get("limit");
  const before = beforeRaw ? new Date(beforeRaw) : null;
  const limit = Math.min(
    Math.max(parseInt(limitRaw ?? "", 10) || 0, 0) || 50,
    50,
  );

  // Drafts are private. Only the owner (or an admin) may list them.
  if (includeDrafts) {
    const session = await auth().catch(() => null);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!(await staffCan(session, "content:curate")) && userId !== session.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  try {
    const blogs = await prisma.blogPost.findMany({
      where: {
        ...(includeDrafts ? {} : { published: true }),
        ...(userId ? { userId } : {}),
        ...(excludeFeatured ? { featured: false } : {}),
        // SQLite doesn't have a native JSON-array filter, so we LIKE-match the
        // tag as a quoted substring inside the JSON-encoded tags column.
        ...(tag ? { tags: { contains: `"${tag}"` } } : {}),
        ...(before && !Number.isNaN(before.getTime())
          ? { createdAt: { lt: before } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
        _count: { select: { reactions: true, comments: true } },
      },
    });
    return NextResponse.json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json({ error: "failed to fetch blogs" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  coverImage: z.string().url().optional().or(z.literal("")),
  published: z.boolean().optional(),
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

  // Drafts are private. Only the owner (or an admin) may list them.
  if (includeDrafts) {
    const session = await auth().catch(() => null);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!isAdmin(session) && userId !== session.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  try {
    const blogs = await prisma.blogPost.findMany({
      where: {
        ...(includeDrafts ? {} : { published: true }),
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });
    return NextResponse.json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json({ error: "failed to fetch blogs" }, { status: 500 });
  }
}

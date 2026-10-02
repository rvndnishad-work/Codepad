import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { staffContext } from "@/app/admin/content/_lib/guard";
import { parseSchedule } from "@/app/admin/content/_lib/schedule";
import { BLOG_STATUSES, NEEDS_REASON, notifyBlogAuthor } from "../_shared";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(BLOG_STATUSES).optional(),
  featured: z.boolean().optional(),
  adminNotes: z.string().max(4000).nullable().optional(),
  /** ISO time to publish at; null or "" clears the schedule. */
  scheduledAt: z.string().nullable().optional(),
});

/**
 * Moderate one post. Only the fields in the body change: `published` follows
 * `status` only when `status` is sent (a body with just `featured` used to
 * unpublish the post). `publishedAt` is set the first time a post goes live.
 */
export async function PATCH(req: Request, { params }: Params) {
  const ctx = await staffContext("content:curate");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const body = parsed.data;

  const blog = await prisma.blogPost.findUnique({
    where: { id },
    select: { id: true, title: true, slug: true, userId: true, status: true, published: true, featured: true, publishedAt: true, scheduledAt: true, adminNotes: true },
  });
  if (!blog) return NextResponse.json({ error: "Blog post not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.featured !== undefined) data.featured = body.featured;
  if (body.adminNotes !== undefined) data.adminNotes = body.adminNotes?.trim() || null;

  if (body.status !== undefined) {
    if (NEEDS_REASON.has(body.status) && body.status !== blog.status && !body.adminNotes?.trim()) {
      return NextResponse.json({ error: "Add a note for the author explaining why." }, { status: 400 });
    }
    data.status = body.status;
    data.published = body.status === "PUBLISHED";
    if (body.status === "PUBLISHED") {
      data.scheduledAt = null;
      if (!blog.publishedAt) data.publishedAt = new Date();
    }
  }

  if (body.scheduledAt !== undefined && body.status !== "PUBLISHED") {
    const sched = parseSchedule(body.scheduledAt);
    if (!sched.ok) return NextResponse.json({ error: sched.error }, { status: 400 });
    data.scheduledAt = sched.at;
    if (sched.at) {
      // A scheduled post waits off the site until the cron publishes it.
      data.published = false;
      if (!body.status) data.status = blog.status === "PUBLISHED" ? "PENDING" : blog.status;
    }
  } else if (body.status !== undefined && body.status !== "PUBLISHED" && body.status !== blog.status) {
    // Moving a post to another state drops any pending schedule.
    data.scheduledAt = null;
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  const updated = await prisma.blogPost.update({ where: { id }, data });

  const newStatus = (data.status as string | undefined) ?? blog.status;
  await logAdminAction({
    actor: ctx.actor,
    action:
      data.scheduledAt instanceof Date
        ? "content.blog.schedule"
        : body.status && body.status !== blog.status
          ? `content.blog.${newStatus.toLowerCase()}`
          : "content.blog.update",
    targetType: "blog",
    targetId: id,
    targetLabel: blog.title,
    before: { status: blog.status, published: blog.published, featured: blog.featured, scheduledAt: blog.scheduledAt },
    after: data,
    note: body.adminNotes ?? null,
  });
  if (body.status && body.status !== blog.status && body.adminNotes?.trim()) {
    await notifyBlogAuthor(blog, body.status, body.adminNotes.trim());
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await staffContext("content:curate");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const blog = await prisma.blogPost.findUnique({ where: { id }, select: { title: true, slug: true, userId: true, status: true } });
  if (!blog) return NextResponse.json({ error: "Blog post not found" }, { status: 404 });

  await prisma.blogPost.delete({ where: { id } });
  await logAdminAction({
    actor: ctx.actor,
    action: "content.blog.delete",
    targetType: "blog",
    targetId: id,
    targetLabel: blog.title,
    before: blog,
  });
  return NextResponse.json({ ok: true });
}

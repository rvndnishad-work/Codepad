import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { staffContext } from "@/app/admin/content/_lib/guard";
import { notifyBlogAuthor } from "../_shared";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["publish", "unpublish", "feature", "unfeature", "reject", "mark-pending", "needs-changes", "delete"]),
  /** Required for reject and needs-changes; sent to each author. */
  reason: z.string().max(4000).optional(),
});

export async function POST(req: Request) {
  const ctx = await staffContext("content:curate");
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { ids, action } = parsed.data;
  const reason = parsed.data.reason?.trim() || "";
  if ((action === "reject" || action === "needs-changes") && !reason) {
    return NextResponse.json({ error: "Add a reason for the authors." }, { status: 400 });
  }

  const posts = await prisma.blogPost.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, slug: true, userId: true, status: true, published: true, featured: true },
  });
  const found = posts.map((p) => p.id);

  try {
    let count: number;
    if (action === "delete") {
      count = (await prisma.blogPost.deleteMany({ where: { id: { in: found } } })).count;
    } else {
      const data: Record<string, unknown> = {};
      switch (action) {
        case "publish":
          Object.assign(data, { status: "PUBLISHED", published: true, scheduledAt: null });
          break;
        case "unpublish":
          Object.assign(data, { status: "DRAFT", published: false, scheduledAt: null });
          break;
        case "reject":
          Object.assign(data, { status: "REJECTED", published: false, scheduledAt: null, adminNotes: reason });
          break;
        case "mark-pending":
          // Pending means "waiting for review", so it must come off the site too.
          Object.assign(data, { status: "PENDING", published: false, scheduledAt: null });
          break;
        case "needs-changes":
          Object.assign(data, { status: "NEEDS_CHANGES", published: false, scheduledAt: null, adminNotes: reason });
          break;
        case "feature":
          data.featured = true;
          break;
        case "unfeature":
          data.featured = false;
          break;
      }
      count = await prisma.$transaction(async (tx) => {
        const r = await tx.blogPost.updateMany({ where: { id: { in: found } }, data });
        if (action === "publish") {
          await tx.blogPost.updateMany({ where: { id: { in: found }, publishedAt: null }, data: { publishedAt: new Date() } });
        }
        return r.count;
      });
    }

    await Promise.all(
      posts.map(async (p) => {
        await logAdminAction({
          actor: ctx.actor,
          action: `content.blog.${action}`,
          targetType: "blog",
          targetId: p.id,
          targetLabel: p.title,
          before: { status: p.status, published: p.published, featured: p.featured },
          note: reason || null,
        });
        if (action === "reject" && p.status !== "REJECTED") await notifyBlogAuthor(p, "REJECTED", reason);
        if (action === "needs-changes" && p.status !== "NEEDS_CHANGES") await notifyBlogAuthor(p, "NEEDS_CHANGES", reason);
      }),
    );
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    console.error("Bulk blog action error:", error);
    return NextResponse.json({ error: "bulk action failed" }, { status: 500 });
  }
}

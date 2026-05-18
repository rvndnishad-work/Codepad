import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum([
    "publish",
    "unpublish",
    "feature",
    "unfeature",
    "reject",
    "mark-pending",
    "needs-changes",
    "delete",
  ]),
});

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ids, action } = parsed.data;

  try {
    if (action === "delete") {
      const result = await prisma.blogPost.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ ok: true, count: result.count });
    }

    const data: Record<string, unknown> = {};
    switch (action) {
      case "publish":
        data.status = "PUBLISHED";
        data.published = true;
        break;
      case "unpublish":
        data.status = "DRAFT";
        data.published = false;
        break;
      case "reject":
        data.status = "REJECTED";
        data.published = false;
        break;
      case "mark-pending":
        data.status = "PENDING";
        break;
      case "needs-changes":
        data.status = "NEEDS_CHANGES";
        data.published = false;
        break;
      case "feature":
        data.featured = true;
        break;
      case "unfeature":
        data.featured = false;
        break;
    }

    const result = await prisma.blogPost.updateMany({
      where: { id: { in: ids } },
      data,
    });
    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    console.error("Bulk blog action error:", error);
    return NextResponse.json({ error: "bulk action failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { staffContext } from "@/app/admin/content/_lib/guard";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["publish", "unpublish", "feature", "unfeature", "archive", "restore", "delete", "markPremium", "markFree"]),
});

export async function POST(req: Request) {
  const ctx = await staffContext("content:curate");
  if (!ctx) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { ids, action } = parsed.data;

  const rows = await prisma.challenge.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      title: true,
      published: true,
      archivedAt: true,
      _count: { select: { attempts: true, takeHomeAssignments: true } },
    },
  });

  try {
    let affected = rows;
    let skipped = 0;
    if (action === "delete") {
      // Only challenges with no history can go; the rest stay put.
      affected = rows.filter((r) => r._count.attempts === 0 && r._count.takeHomeAssignments === 0);
      skipped = rows.length - affected.length;
      await prisma.challenge.deleteMany({ where: { id: { in: affected.map((r) => r.id) } } });
    } else {
      if (action === "publish") {
        affected = rows.filter((r) => !r.archivedAt);
        skipped = rows.length - affected.length;
      }
      const target = { id: { in: affected.map((r) => r.id) } };
      const data: Record<string, unknown> = {
        publish: { published: true, scheduledAt: null },
        unpublish: { published: false, scheduledAt: null },
        feature: { featured: true },
        unfeature: { featured: false },
        archive: { archivedAt: new Date(), published: false, featured: false, scheduledAt: null },
        restore: { archivedAt: null },
        markPremium: { premium: true },
        markFree: { premium: false },
      }[action];
      await prisma.$transaction(async (tx) => {
        await tx.challenge.updateMany({ where: target, data });
        if (action === "publish") {
          await tx.challenge.updateMany({ where: { ...target, publishedAt: null }, data: { publishedAt: new Date() } });
        }
      });
    }

    await Promise.all(
      affected.map((r) =>
        logAdminAction({
          actor: ctx.actor,
          action: `content.challenge.${action === "markPremium" ? "premium" : action === "markFree" ? "free" : action}`,
          targetType: "challenge",
          targetId: r.id,
          targetLabel: r.title,
          before: { published: r.published, archivedAt: r.archivedAt },
        }),
      ),
    );
    return NextResponse.json({
      ok: true,
      count: affected.length,
      skipped,
      ...(skipped
        ? {
            message:
              action === "delete"
                ? `${skipped} skipped: they have attempts or take-homes. Archive those instead.`
                : `${skipped} archived challenges skipped. Restore them first.`,
          }
        : {}),
    });
  } catch (error) {
    console.error("Bulk challenge action error:", error);
    return NextResponse.json({ error: "bulk action failed" }, { status: 500 });
  }
}

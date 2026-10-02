import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TARGET_TYPES, loadTargets, previewFor } from "@/app/admin/community/_lib/targets";
import { REPORT_REASONS, REPORTS_PER_MINUTE } from "./reasons";

const schema = z.object({
  targetType: z.enum(TARGET_TYPES),
  targetId: z.string().min(1).max(64),
  reason: z.enum(REPORT_REASONS.map((r) => r.id) as [string, ...string[]]),
  detail: z.string().max(1000).optional(),
});

/**
 * A signed-in member reports a comment, post, snippet or experience. It lands
 * in /admin/community as an open report. One open report per member per
 * item; at most REPORTS_PER_MINUTE a minute per member.
 */
export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in to report." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  const { targetType, targetId, reason } = parsed.data;
  const detail = parsed.data.detail?.trim() || null;

  const [recent, duplicate, targets] = await Promise.all([
    prisma.contentReport.count({ where: { reporterId: userId, createdAt: { gte: new Date(Date.now() - 60_000) } } }),
    prisma.contentReport.findFirst({ where: { reporterId: userId, targetType, targetId, status: "open" }, select: { id: true } }),
    loadTargets([{ targetType, targetId }]),
  ]);
  if (recent >= REPORTS_PER_MINUTE) {
    return NextResponse.json({ error: "Too many reports. Try again in a minute." }, { status: 429 });
  }
  const target = previewFor(targets, targetType, targetId);
  // Only things the member could see publicly can be reported.
  if (!target.exists || target.hidden) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (target.authorId === userId) return NextResponse.json({ error: "You cannot report your own content." }, { status: 400 });
  // Already reported and still open: say thanks again, store nothing new.
  if (duplicate) return NextResponse.json({ ok: true, id: duplicate.id });

  const report = await prisma.contentReport.create({
    data: { targetType, targetId, reason, detail, reporterId: userId },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: report.id }, { status: 201 });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { staffContext } from "@/app/admin/content/_lib/guard";
import { parseSchedule } from "@/app/admin/content/_lib/schedule";
import { challengeSchema, legacyMirror, stepColumns } from "./_shared";

export async function POST(req: Request) {
  const ctx = await staffContext("content:curate");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = challengeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const data = parsed.data;
  const sched = parseSchedule(data.published ? null : data.scheduledAt);
  if (!sched.ok) return NextResponse.json({ error: sched.error }, { status: 400 });

  const existing = await prisma.challenge.findUnique({ where: { slug: data.slug }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const challenge = await tx.challenge.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        tags: JSON.stringify(data.tags),
        category: data.category,
        published: data.published,
        publishedAt: data.published ? new Date() : null,
        scheduledAt: sched.at,
        visibility: data.visibility ?? "public",
        featured: data.featured ?? false,
        premium: data.premium ?? false,
        ...legacyMirror(data.steps[0]),
      },
      select: { id: true, slug: true },
    });
    await tx.challengeStep.createMany({
      data: data.steps.map((s, i) => ({ challengeId: challenge.id, ...stepColumns(s, i) })),
    });
    return challenge;
  });

  await logAdminAction({
    actor: ctx.actor,
    action: "content.challenge.create",
    targetType: "challenge",
    targetId: created.id,
    targetLabel: data.title,
    after: { slug: data.slug, published: data.published, scheduledAt: sched.at, steps: data.steps.length },
  });
  return NextResponse.json(created, { status: 201 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { staffContext, type StaffContext } from "@/app/admin/content/_lib/guard";
import { parseSchedule } from "@/app/admin/content/_lib/schedule";
import { challengeSchema, legacyMirror, StepSyncError, syncSteps } from "../_shared";

// PATCH accepts either a full update payload (steps[] present) or a partial
// "toggle" payload for the list's quick actions and archive/restore.
const partialSchema = z.object({
  published: z.boolean().optional(),
  visibility: z.enum(["public", "private"]).optional(),
  featured: z.boolean().optional(),
  premium: z.boolean().optional(),
  scheduledAt: z.string().nullable().optional(),
  /** true archives (hidden everywhere, attempts kept); false restores as a draft. */
  archived: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

const STATE_SELECT = {
  id: true,
  title: true,
  slug: true,
  published: true,
  publishedAt: true,
  scheduledAt: true,
  archivedAt: true,
  featured: true,
  premium: true,
  visibility: true,
} as const;

async function applyFull(ctx: StaffContext, id: string, json: unknown) {
  const parsed = challengeSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const data = parsed.data;

  const before = await prisma.challenge.findUnique({ where: { id }, select: STATE_SELECT });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.archivedAt && data.published) {
    return NextResponse.json({ error: "Restore the challenge before publishing it." }, { status: 409 });
  }

  const conflict = await prisma.challenge.findFirst({ where: { slug: data.slug, NOT: { id } }, select: { id: true } });
  if (conflict) return NextResponse.json({ error: "Slug already in use" }, { status: 409 });

  let scheduledAt: Date | null | undefined;
  if (data.published) scheduledAt = null;
  else if (data.scheduledAt !== undefined) {
    const sched = parseSchedule(data.scheduledAt);
    if (!sched.ok) return NextResponse.json({ error: sched.error }, { status: 400 });
    scheduledAt = sched.at;
  }

  try {
    const { updated, plan } = await prisma.$transaction(async (tx) => {
      const c = await tx.challenge.update({
        where: { id },
        data: {
          slug: data.slug,
          title: data.title,
          description: data.description,
          difficulty: data.difficulty,
          tags: JSON.stringify(data.tags),
          category: data.category,
          published: data.published,
          ...(data.published && !before.publishedAt ? { publishedAt: new Date() } : {}),
          ...(scheduledAt !== undefined ? { scheduledAt } : {}),
          visibility: data.visibility ?? "public",
          // The form only sends these for admins; leave them alone otherwise.
          ...(data.featured !== undefined ? { featured: data.featured } : {}),
          ...(data.premium !== undefined ? { premium: data.premium } : {}),
          ...legacyMirror(data.steps[0]),
        },
        select: { id: true, slug: true },
      });
      const plan = await syncSteps(tx, id, data.steps);
      return { updated: c, plan };
    });
    await logAdminAction({
      actor: ctx.actor,
      action: "content.challenge.update",
      targetType: "challenge",
      targetId: id,
      targetLabel: data.title,
      before: { published: before.published, scheduledAt: before.scheduledAt, slug: before.slug },
      after: {
        published: data.published,
        scheduledAt,
        slug: data.slug,
        steps: { updated: plan.updates.length, created: plan.creates.length, deleted: plan.deletes.length },
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof StepSyncError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error("[admin-challenges] save failed", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

async function applyPartial(ctx: StaffContext, id: string, json: unknown) {
  const parsed = partialSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const body = parsed.data;
  if (Object.values(body).every((v) => v === undefined)) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const before = await prisma.challenge.findUnique({ where: { id }, select: STATE_SELECT });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.visibility !== undefined) data.visibility = body.visibility;
  if (body.featured !== undefined) data.featured = body.featured;
  if (body.premium !== undefined) data.premium = body.premium;

  if (body.archived === true) {
    // Archive: off every public list and page, never auto-published.
    Object.assign(data, { archivedAt: new Date(), published: false, featured: false, scheduledAt: null });
  } else if (body.archived === false) {
    Object.assign(data, { archivedAt: null });
  }

  const archivedAfter = body.archived === true || (body.archived === undefined && before.archivedAt !== null);
  if (body.published !== undefined && body.archived !== true) {
    if (body.published && archivedAfter) {
      return NextResponse.json({ error: "Restore the challenge before publishing it." }, { status: 409 });
    }
    data.published = body.published;
    data.scheduledAt = null;
    if (body.published && !before.publishedAt) data.publishedAt = new Date();
  }
  if (body.scheduledAt !== undefined && body.published === undefined && body.archived !== true) {
    if (archivedAfter) return NextResponse.json({ error: "Restore the challenge before scheduling it." }, { status: 409 });
    const sched = parseSchedule(body.scheduledAt);
    if (!sched.ok) return NextResponse.json({ error: sched.error }, { status: 400 });
    data.scheduledAt = sched.at;
    if (sched.at) data.published = false;
  }

  const updated = await prisma.challenge.update({ where: { id }, data, select: STATE_SELECT });
  const action =
    body.archived === true
      ? "content.challenge.archive"
      : body.archived === false
        ? "content.challenge.restore"
        : data.scheduledAt instanceof Date
          ? "content.challenge.schedule"
          : body.published === true
            ? "content.challenge.publish"
            : body.published === false
              ? "content.challenge.unpublish"
              : "content.challenge.update";
  await logAdminAction({
    actor: ctx.actor,
    action,
    targetType: "challenge",
    targetId: id,
    targetLabel: before.title,
    before,
    after: data,
  });
  return NextResponse.json(updated);
}

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await staffContext("content:curate");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const isFull = typeof json === "object" && json !== null && Array.isArray((json as { steps?: unknown }).steps);
  return isFull ? applyFull(ctx, id, json) : applyPartial(ctx, id, json);
}

// PUT kept as alias for the form's earlier behaviour; new code uses PATCH.
export async function PUT(req: Request, { params }: Params) {
  return PATCH(req, { params });
}

/**
 * Hard delete, only for a challenge nobody has attempted or been sent as a
 * take-home. Anything else is archived instead, so history is kept.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await staffContext("content:curate");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const c = await prisma.challenge.findUnique({
    where: { id },
    select: { title: true, slug: true, _count: { select: { attempts: true, takeHomeAssignments: true } } },
  });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (c._count.attempts > 0 || c._count.takeHomeAssignments > 0) {
    return NextResponse.json(
      { error: `This challenge has ${c._count.attempts} attempts and ${c._count.takeHomeAssignments} take-homes. Archive it instead.` },
      { status: 409 },
    );
  }
  await prisma.challenge.delete({ where: { id } });
  await logAdminAction({
    actor: ctx.actor,
    action: "content.challenge.delete",
    targetType: "challenge",
    targetId: id,
    targetLabel: c.title,
    before: { slug: c.slug },
  });
  return NextResponse.json({ ok: true });
}

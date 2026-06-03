import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const bulkCreateSchema = z.object({
  candidates: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().max(40).optional().or(z.literal("")),
        notes: z.string().max(10000).optional().or(z.literal("")),
        tags: z.array(z.string().max(40)).optional(),
        source: z.string().max(40).optional().or(z.literal("")),
      })
    )
    .min(1)
    .max(200),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
});

async function authorize(slug: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "unauthorized" as const, status: 401 };
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: { members: { select: { userId: true } } },
  });
  if (!workspace) return { error: "Workspace not found" as const, status: 404 };
  const isMember = workspace.members.some((m) => m.userId === session.user!.id);
  if (!isMember) return { error: "Forbidden" as const, status: 403 };
  return { workspace, userId: session.user.id };
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await authorize(slug);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => null);
  const parsed = bulkCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const failed: { row: number; reason: string }[] = [];

  for (let i = 0; i < parsed.data.candidates.length; i++) {
    const c = parsed.data.candidates[i];
    const normalizedEmail = c.email?.toLowerCase().trim() || null;
    const tagsJson = c.tags && c.tags.length ? JSON.stringify(c.tags) : null;

    try {
      if (normalizedEmail) {
        const before = await prisma.candidate.findUnique({
          where: { workspaceId_email: { workspaceId: ctx.workspace.id, email: normalizedEmail } },
          select: { id: true },
        });
        await prisma.candidate.upsert({
          where: { workspaceId_email: { workspaceId: ctx.workspace.id, email: normalizedEmail } },
          update: {
            name: c.name,
            phone: c.phone || undefined,
            notes: c.notes || undefined,
            tags: tagsJson || undefined,
            source: c.source || undefined,
          },
          create: {
            workspaceId: ctx.workspace.id,
            name: c.name,
            email: normalizedEmail,
            phone: c.phone || null,
            notes: c.notes || null,
            tags: tagsJson,
            source: c.source || "bulk-import",
            status: "active",
          },
        });
        if (before) updated += 1;
        else created += 1;
      } else {
        // No email — only create, no dedupe
        await prisma.candidate.create({
          data: {
            workspaceId: ctx.workspace.id,
            name: c.name,
            email: null,
            phone: c.phone || null,
            notes: c.notes || null,
            tags: tagsJson,
            source: c.source || "bulk-import",
            status: "active",
          },
        });
        created += 1;
      }
    } catch (err) {
      failed.push({ row: i + 1, reason: err instanceof Error ? err.message : String(err) });
      skipped += 1;
    }
  }

  return NextResponse.json({ ok: true, created, updated, skipped, failed });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await authorize(slug);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await req.json().catch(() => null);
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Only delete candidates that belong to this workspace
  const result = await prisma.candidate.deleteMany({
    where: {
      id: { in: parsed.data.ids },
      workspaceId: ctx.workspace.id,
    },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}

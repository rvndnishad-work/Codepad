import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const filesSchema = z.record(z.string(), z.string());

const testCaseSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  input: z.string().max(20_000),
  expected: z.string().max(20_000),
  isHidden: z.boolean().default(false),
  weight: z.number().int().min(1).max(100).default(10),
});

const stepSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().min(1).max(20_000),
  template: z.string().min(1).max(40),
  starterFiles: filesSchema,
  testFiles: filesSchema,
  estimatedMinutes: z.number().int().min(1).max(300),
  hint: z.string().max(20_000).optional(),
  videoUrl: z.string().max(500).optional(),
  testCases: z.array(testCaseSchema).optional(),
});

// Full-update payload (PATCH or PUT). PATCH still accepts partial bodies via
// the `.partial()` variant below for quick toggles.
const fullSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(20_000),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string().max(40)).max(20),
  category: z.string().max(80).nullable(),
  published: z.boolean(),
  visibility: z.enum(["public", "private"]).optional(),
  featured: z.boolean().optional(),
  premium: z.boolean().optional(),
  steps: z.array(stepSchema).min(1).max(20),
});

const partialSchema = z.object({
  published: z.boolean().optional(),
  visibility: z.enum(["public", "private"]).optional(),
  featured: z.boolean().optional(),
  premium: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

// PATCH accepts either a full update payload (steps[] present) or a partial
// "toggle" payload (published-only). Keeps the admin list-row quick-publish
// flow working alongside the form's full save.
async function applyUpdate(id: string, json: unknown) {
  const isFull =
    typeof json === "object" &&
    json !== null &&
    Array.isArray((json as { steps?: unknown }).steps);

  if (isFull) {
    const parsed = fullSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const conflict = await prisma.challenge.findFirst({
      where: { slug: data.slug, NOT: { id } },
      select: { id: true },
    });
    if (conflict) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }

    const first = data.steps[0];
    try {
      const updated = await prisma.$transaction(async (tx) => {
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
            visibility: data.visibility ?? "public",
            featured: data.featured ?? false,
            premium: data.premium ?? false,
            // Legacy mirror — kept until Stage 2 drops these columns.
            template: first.template,
            starterFiles: JSON.stringify(first.starterFiles),
            testFiles: JSON.stringify(first.testFiles),
            estimatedMinutes: first.estimatedMinutes,
          },
          select: { id: true, slug: true },
        });
        await tx.challengeStep.deleteMany({ where: { challengeId: id } });
        await tx.challengeStep.createMany({
          data: data.steps.map((s, i) => ({
            challengeId: id,
            position: i,
            title: s.title || null,
            description: s.description,
            template: s.template,
            starterFiles: JSON.stringify(s.starterFiles),
            testFiles: JSON.stringify(s.testFiles),
            estimatedMinutes: s.estimatedMinutes,
            hint: s.hint || null,
            videoUrl: s.videoUrl || null,
            testCasesJson: JSON.stringify(s.testCases || []),
          })),
        });
        return c;
      });
      return NextResponse.json(updated);
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  // Partial / toggle path — used by admin list quick actions.
  const parsed = partialSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const data = parsed.data;
  if (
    data.published === undefined &&
    data.visibility === undefined &&
    data.featured === undefined &&
    data.premium === undefined
  ) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  try {
    const updated = await prisma.challenge.update({
      where: { id },
      data: {
        published: data.published,
        visibility: data.visibility,
        featured: data.featured,
        premium: data.premium,
      },
      select: { id: true, published: true, visibility: true, featured: true, premium: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const json = await req.json().catch(() => null);
  return applyUpdate(id, json);
}

// PUT kept as alias for the form's earlier behaviour; new code uses PATCH.
export async function PUT(req: Request, { params }: Params) {
  return PATCH(req, { params });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await prisma.challenge.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

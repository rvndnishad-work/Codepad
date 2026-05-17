import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const filesSchema = z.record(z.string(), z.string());

const stepSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().min(1).max(20_000),
  template: z.string().min(1).max(40),
  starterFiles: filesSchema,
  testFiles: filesSchema,
  estimatedMinutes: z.number().int().min(1).max(300),
  hint: z.string().max(20_000).optional(),
  videoUrl: z.string().max(500).optional(),
});

const payloadSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and dashes"),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(20_000),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string().max(40)).max(20),
  category: z.string().max(80).nullable(),
  published: z.boolean(),
  visibility: z.enum(["public", "private"]).optional(),
  featured: z.boolean().optional(),
  steps: z.array(stepSchema).min(1).max(20),
});

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.challenge.findUnique({
    where: { slug: data.slug },
  });
  if (existing) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  // Step 1 backfill: legacy fields on Challenge mirror step[0] so unmigrated
  // read paths keep working. Stage 2 will drop the legacy columns.
  const first = data.steps[0];

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
        visibility: data.visibility ?? "public",
        featured: data.featured ?? false,
        // Legacy mirror
        template: first.template,
        starterFiles: JSON.stringify(first.starterFiles),
        testFiles: JSON.stringify(first.testFiles),
        estimatedMinutes: first.estimatedMinutes,
      },
      select: { id: true, slug: true },
    });

    await tx.challengeStep.createMany({
      data: data.steps.map((s, i) => ({
        challengeId: challenge.id,
        position: i,
        title: s.title || null,
        description: s.description,
        template: s.template,
        starterFiles: JSON.stringify(s.starterFiles),
        testFiles: JSON.stringify(s.testFiles),
        estimatedMinutes: s.estimatedMinutes,
        hint: s.hint || null,
        videoUrl: s.videoUrl || null,
      })),
    });

    return challenge;
  });

  return NextResponse.json(created, { status: 201 });
}

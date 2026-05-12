import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const filesSchema = z.record(z.string(), z.string());

const updateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(20_000),
  difficulty: z.enum(["easy", "medium", "hard"]),
  template: z.string().min(1).max(40),
  starterFiles: filesSchema,
  testFiles: filesSchema,
  tags: z.array(z.string().max(40)).max(20),
  estimatedMinutes: z.number().int().min(1).max(300),
  category: z.string().max(80).nullable(),
  published: z.boolean(),
});

const patchSchema = z.object({
  published: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const data = parsed.data;

  const conflict = await prisma.challenge.findFirst({
    where: { slug: data.slug, NOT: { id } },
    select: { id: true },
  });
  if (conflict) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  try {
    const updated = await prisma.challenge.update({
      where: { id },
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        template: data.template,
        starterFiles: JSON.stringify(data.starterFiles),
        testFiles: JSON.stringify(data.testFiles),
        tags: JSON.stringify(data.tags),
        estimatedMinutes: data.estimatedMinutes,
        category: data.category,
        published: data.published,
      },
      select: { id: true, slug: true },
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
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  if (parsed.data.published === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.challenge.update({
      where: { id },
      data: { published: parsed.data.published },
      select: { id: true, published: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
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

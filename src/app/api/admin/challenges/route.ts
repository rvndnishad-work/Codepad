import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const filesSchema = z.record(z.string(), z.string());

const payloadSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and dashes"),
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

  const existing = await prisma.challenge.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const challenge = await prisma.challenge.create({
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

  return NextResponse.json(challenge, { status: 201 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Public submission of an interview experience. Always lands as `pending` for
 * admin moderation (see /admin/interview-questions/experiences). A company is
 * linked when the submitted name matches an existing Company; otherwise the
 * raw name is kept on `companyName`.
 */
const schema = z.object({
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().max(120).optional().nullable(),
  experienceLevel: z.string().trim().max(40).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  year: z.number().int().min(2000).max(2100).optional().nullable(),
  process: z.string().trim().max(5000).optional().nullable(),
  rounds: z.string().trim().max(5000).optional().nullable(),
  result: z.enum(["selected", "rejected", "pending"]).optional().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().nullable(),
  tips: z.string().trim().max(3000).optional().nullable(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  // Best-effort author attribution (optional — submission is allowed anonymously).
  const session = await auth().catch(() => null);

  const match = await prisma.company.findFirst({
    where: { name: { equals: d.company, mode: "insensitive" } },
    select: { id: true },
  });

  await prisma.prepExperience.create({
    data: {
      companyId: match?.id ?? null,
      companyName: d.company,
      role: d.role ?? null,
      experienceLevel: d.experienceLevel ?? null,
      location: d.location ?? null,
      year: d.year ?? null,
      process: d.process ?? null,
      rounds: d.rounds ?? null,
      result: d.result ?? null,
      difficulty: d.difficulty ?? null,
      tips: d.tips ?? null,
      status: "pending",
      authorId: session?.user?.id ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

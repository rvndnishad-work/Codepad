import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  bio: z.string().max(600).nullable().optional(),
  hireMeUrl: z
    .string()
    .max(300)
    .refine(
      (v) =>
        !v ||
        v.startsWith("http://") ||
        v.startsWith("https://") ||
        v.startsWith("mailto:"),
      { message: "hireMeUrl must start with http(s):// or mailto:" }
    )
    .nullable()
    .optional(),
  portfolioPublic: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.bio !== undefined) data.bio = parsed.data.bio || null;
  if (parsed.data.hireMeUrl !== undefined) data.hireMeUrl = parsed.data.hireMeUrl || null;
  if (parsed.data.portfolioPublic !== undefined) data.portfolioPublic = parsed.data.portfolioPublic;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, bio: true, hireMeUrl: true, portfolioPublic: true },
  });
  return NextResponse.json(updated);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, bio: true, hireMeUrl: true, portfolioPublic: true, name: true, image: true },
  });
  return NextResponse.json(user);
}

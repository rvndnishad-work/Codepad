import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { templatesById } from "@/lib/templates";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const MAX_FILES_BYTES = 500_000;

const filesSchema = z.record(
  z.string(),
  z.union([z.object({ code: z.string() }), z.string()])
);

const createSchema = z.object({
  title: z.string().min(1).max(120),
  template: z.string().min(1),
  files: filesSchema,
  visibility: z.enum(["private", "public"]).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(clientKey(req, session.user.id), 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "retry-after": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { title, template, files, visibility = "private" } = parsed.data;

  if (!templatesById[template]) {
    return NextResponse.json({ error: "unknown template" }, { status: 400 });
  }

  const filesJson = JSON.stringify(files);
  if (filesJson.length > MAX_FILES_BYTES) {
    return NextResponse.json({ error: "snippet too large" }, { status: 413 });
  }

  const slug = nanoid(10);
  const snippet = await prisma.snippet.create({
    data: {
      slug,
      title,
      template,
      files: filesJson,
      visibility,
      userId: session.user.id,
    },
  });
  return NextResponse.json({ id: snippet.id, slug: snippet.slug });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rl = rateLimit(clientKey(req, session.user.id), 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate limited" }, { status: 429 });

  const items = await prisma.snippet.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, title: true, template: true, updatedAt: true, visibility: true },
  });
  return NextResponse.json({ items });
}

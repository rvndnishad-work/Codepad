import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const MAX_FILES_BYTES = 500_000;

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  files: z
    .record(z.string(), z.union([z.object({ code: z.string() }), z.string()]))
    .optional(),
  visibility: z.enum(["private", "public"]).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  pinned: z.boolean().optional(),
});

async function requireOwner(id: string, userId: string) {
  const snippet = await prisma.snippet.findUnique({ where: { id } });
  if (!snippet) return { error: "not found", status: 404 as const };
  if (snippet.userId !== userId) return { error: "forbidden", status: 403 as const };
  return { snippet };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const snippet = await prisma.snippet.findUnique({ where: { id } });
  if (!snippet) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(snippet);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const guard = await requireOwner(id, session.user.id);
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.visibility !== undefined) data.visibility = parsed.data.visibility;
  if (parsed.data.files !== undefined) {
    const json = JSON.stringify(parsed.data.files);
    if (json.length > MAX_FILES_BYTES) {
      return NextResponse.json({ error: "snippet too large" }, { status: 413 });
    }
    data.files = json;
  }
  if (parsed.data.tags !== undefined) {
    const cleaned = Array.from(
      new Set(parsed.data.tags.map((t) => t.trim()).filter(Boolean))
    ).slice(0, 20);
    data.tags = cleaned.length ? JSON.stringify(cleaned) : null;
  }
  if (parsed.data.pinned !== undefined) data.pinned = parsed.data.pinned;

  const updated = await prisma.snippet.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id, slug: updated.slug });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const guard = await requireOwner(id, session.user.id);
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  await prisma.snippet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

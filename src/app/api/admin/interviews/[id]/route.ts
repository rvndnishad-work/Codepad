import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["scheduled", "in_progress", "completed", "abandoned"]).optional(),
  regenerateShareToken: z.boolean().optional(),
});

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "unauthorized" as const, status: 401 };
  }
  if (!(await staffCan(session, "platform:admin"))) {
    return { error: "forbidden" as const, status: 403 };
  }
  return { ok: true as const };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await ensureAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
    if (parsed.data.status === "completed" || parsed.data.status === "abandoned") {
      data.finishedAt = new Date();
    }
  }
  if (parsed.data.regenerateShareToken) {
    data.shareToken = nanoid(24);
  }

  try {
    const updated = await prisma.interviewSession.update({
      where: { id },
      data,
      select: { id: true, status: true, shareToken: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await ensureAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    await prisma.interviewSession.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

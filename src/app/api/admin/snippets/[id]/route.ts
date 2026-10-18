import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { staffContext } from "@/app/admin/content/_lib/guard";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await staffContext("content:curate");
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { pinned?: unknown };

  if (typeof body.pinned !== "boolean") {
    return NextResponse.json({ error: "Invalid body: expected { pinned: boolean }" }, { status: 400 });
  }

  try {
    const existing = await prisma.snippet.findUnique({
      where: { id },
      select: { id: true, visibility: true, title: true, pinned: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
    }
    // Pinning a non-public snippet would have no visible effect (it wouldn't
    // surface on /). Reject the request so admins notice rather than silently
    // pinning into the void.
    if (body.pinned && existing.visibility !== "public") {
      return NextResponse.json(
        { error: "Only public snippets can be pinned" },
        { status: 409 }
      );
    }

    const updated = await prisma.snippet.update({
      where: { id },
      data: { pinned: body.pinned },
      select: { id: true, pinned: true },
    });
    await logAdminAction({
      actor: ctx.actor,
      action: body.pinned ? "content.snippet.pin" : "content.snippet.unpin",
      targetType: "snippet",
      targetId: id,
      targetLabel: existing.title,
      before: { pinned: existing.pinned },
      after: { pinned: body.pinned },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Snippet pin update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

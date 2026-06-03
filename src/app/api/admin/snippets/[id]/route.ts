import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { pinned?: unknown };

  if (typeof body.pinned !== "boolean") {
    return NextResponse.json({ error: "Invalid body: expected { pinned: boolean }" }, { status: 400 });
  }

  try {
    const existing = await prisma.snippet.findUnique({
      where: { id },
      select: { id: true, visibility: true },
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
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Snippet pin update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Increment / decrement a question's like count. Anonymous-friendly: the client
 * tracks its own like state in localStorage and sends `liked` to apply the
 * delta. Proper per-user voting is a Phase-2 enhancement.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const liked = body?.liked === true;

  const q = await prisma.prepQuestion.findFirst({
    where: { slug, status: "published" },
    select: { likes: true },
  });
  if (!q) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = await prisma.prepQuestion.update({
    where: { slug },
    data: { likes: liked ? { increment: 1 } : { decrement: q.likes > 0 ? 1 : 0 } },
    select: { likes: true },
  });
  return NextResponse.json({ likes: updated.likes });
}

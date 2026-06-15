import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Best-effort view counter — pinged once per page mount from the client. */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    await prisma.prepQuestion.updateMany({
      where: { slug, status: "published" },
      data: { views: { increment: 1 } },
    });
  } catch {
    /* non-critical */
  }
  return NextResponse.json({ ok: true });
}

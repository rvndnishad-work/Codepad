import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { trackActivity } from "@/lib/admin/activity";

/** Best-effort view counter — pinged once per page mount from the client.
 *  Also records a question_view activity event for the admin dashboards. */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    // One round trip: bump the counter and read back what the event needs.
    // Throws P2025 when the slug is not a published question (swallowed).
    const [q, session] = await Promise.all([
      prisma.prepQuestion.update({
        where: { slug, status: "published" },
        data: { views: { increment: 1 } },
        select: { id: true, technology: true },
      }),
      auth().catch(() => null),
    ]);
    trackActivity({
      kind: "question_view",
      userId: session?.user?.id ?? null,
      label: q.technology,
      targetId: q.id,
    });
  } catch {
    /* non-critical */
  }
  return NextResponse.json({ ok: true });
}

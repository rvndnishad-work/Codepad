import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/prompt-attempts/[id]/share
 *
 * Toggle whether an attempt is published to the community list for its
 * scenario. Only the attempt's owner can change the flag.
 *
 * Body: { shared: boolean, shareTitle?: string|null, shareNote?: string|null }
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.shared !== "boolean") {
    return NextResponse.json({ error: "Missing required 'shared' boolean." }, { status: 400 });
  }

  const attempt = await prisma.promptAttempt.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  if (attempt.userId !== userId) {
    return NextResponse.json({ error: "Only the attempt's owner can share it." }, { status: 403 });
  }

  // Limit user-supplied strings — defensive against runaway payloads even
  // though the UI also caps these. Null values clear any existing metadata.
  const shareTitle: string | null =
    body.shareTitle == null ? null : String(body.shareTitle).slice(0, 80);
  const shareNote: string | null =
    body.shareNote == null ? null : String(body.shareNote).slice(0, 400);

  const updated = await prisma.promptAttempt.update({
    where: { id },
    data: {
      shared: body.shared,
      // When un-sharing we wipe the metadata so re-sharing later starts clean
      // and so the row stops appearing in community queries that filter by
      // shared=true alone.
      shareTitle: body.shared ? shareTitle : null,
      shareNote: body.shared ? shareNote : null,
    },
    select: { id: true, shared: true, shareTitle: true, shareNote: true, shareUpvotes: true },
  });

  return NextResponse.json({ ok: true, attempt: updated });
}

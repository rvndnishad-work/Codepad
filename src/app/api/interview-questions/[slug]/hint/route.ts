import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateHint } from "@/lib/interview-questions/ai-hint";

/**
 * Return an AI-generated hint for a published question. Cached on the row:
 * generated lazily on first request, reused thereafter. 503 when no LLM key is
 * configured so the UI can degrade gracefully.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const q = await prisma.prepQuestion.findFirst({
    where: { slug, status: "published" },
    select: { id: true, title: true, description: true, aiHint: true },
  });
  if (!q) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (q.aiHint) {
    return NextResponse.json({ hint: q.aiHint, cached: true });
  }

  const hint = await generateHint({ title: q.title, description: q.description });
  if (!hint) {
    return NextResponse.json({ error: "Hints are unavailable right now." }, { status: 503 });
  }

  await prisma.prepQuestion.update({ where: { id: q.id }, data: { aiHint: hint } });
  return NextResponse.json({ hint, cached: false });
}

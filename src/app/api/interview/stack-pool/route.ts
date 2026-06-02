import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classifyChallenge, type CuratableChallenge } from "@/lib/interview/stack";

/**
 * GET /api/interview/stack-pool
 *
 * Returns the curatable challenge pool (published global bank) classified by
 * paradigm/language/framework, so the Tech-Stack wizard can auto-compose a
 * practice session client-side via `curateRounds()`. Backend/frontend
 * playground rounds come from the static template catalog (no pool needed).
 */
function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const rows = await prisma.challenge.findMany({
    where: { published: true, workspaceId: null },
    orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      difficulty: true,
      category: true,
      tags: true,
      steps: { select: { judgingMode: true, languagesJson: true }, orderBy: { position: "asc" }, take: 1 },
    },
  });

  const challenges: (CuratableChallenge & { title: string; difficulty: string })[] = rows.map((c) => {
    const step = c.steps?.[0];
    const meta = classifyChallenge({
      judgingMode: step?.judgingMode,
      languages: parseStringArray(step?.languagesJson),
      tags: parseStringArray(c.tags),
      category: c.category,
    });
    return {
      id: c.id,
      title: c.title,
      difficulty: c.difficulty,
      paradigm: meta.paradigm,
      languages: meta.languages,
      frameworks: meta.frameworks,
    };
  });

  return NextResponse.json({ challenges });
}

import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { staffContext } from "@/app/admin/content/_lib/guard";
import { toCsv } from "@/app/admin/content/_lib/csv";
import { attemptWhere, readFilters } from "@/app/admin/attempts/filters";

/** Rows per export; past this, narrow the filters. Read in batches of BATCH. */
const MAX_ROWS = 10_000;
const BATCH = 1_000;

function testsOf(raw: string | null): string {
  if (!raw) return "";
  try {
    const p = JSON.parse(raw);
    return typeof p?.passed === "number" && typeof p?.total === "number" ? `${p.passed}/${p.total}` : "";
  } catch {
    return "";
  }
}

/** CSV of the attempts list with the same filters as /admin/attempts. Platform admin only. */
export async function GET(req: Request) {
  const ctx = await staffContext("platform:admin");
  if (!ctx) return new Response("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const f = readFilters(Object.fromEntries(url.searchParams));
  const where = attemptWhere(f);

  const rows: unknown[][] = [];
  let cursor: string | undefined;
  while (rows.length < MAX_ROWS) {
    const batch = await prisma.challengeAttempt.findMany({
      where,
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: Math.min(BATCH, MAX_ROWS - rows.length),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        status: true,
        score: true,
        durationSec: true,
        testResults: true,
        startedAt: true,
        finishedAt: true,
        sessionId: true,
        aiSuspicionScore: true,
        integrityReport: { select: { suspicionScore: true, pasteCount: true, blurCount: true } },
        user: { select: { email: true, name: true } },
        challenge: { select: { slug: true, title: true } },
        step: { select: { position: true } },
        takeHomeAssignment: { select: { workspace: { select: { slug: true } } } },
      },
    });
    for (const a of batch) {
      rows.push([
        a.id,
        a.startedAt,
        a.finishedAt,
        a.user.email,
        a.user.name,
        a.challenge.slug,
        a.challenge.title,
        a.step ? a.step.position + 1 : "",
        a.status,
        a.score,
        testsOf(a.testResults),
        a.durationSec,
        a.aiSuspicionScore,
        a.integrityReport?.suspicionScore,
        a.integrityReport?.pasteCount,
        a.integrityReport?.blurCount,
        a.takeHomeAssignment?.workspace?.slug ?? "",
        a.sessionId ?? "",
      ]);
    }
    if (batch.length < BATCH) break;
    cursor = batch[batch.length - 1].id;
  }

  const csv = toCsv(
    ["id", "started_at", "finished_at", "email", "name", "challenge_slug", "challenge", "step", "status", "score", "tests", "duration_sec", "ai_suspicion", "proctor_suspicion", "pastes", "tab_switches", "workspace", "interview_session"],
    rows,
  );
  await logAdminAction({
    actor: ctx.actor,
    action: "content.attempt.export",
    targetType: "attempt",
    targetLabel: `${rows.length} attempts`,
    after: { filters: f, rows: rows.length, capped: rows.length >= MAX_ROWS },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attempts-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

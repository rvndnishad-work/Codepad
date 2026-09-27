import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
import { eraseWorkspace, workspacesDueForErase } from "@/lib/workspace/data-privacy-server";

/**
 * Erases workspaces whose 30-day undo window has passed (Settings > Data
 * and privacy > Delete workspace). The subscription is cancelled first; if
 * that fails the workspace is left for the next run. A few per run, so one
 * large workspace cannot time the job out for the rest.
 *
 * Recommended cadence: daily. Auth: `X-Cron-Secret` / `Authorization: Bearer`.
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const gate = assertCronAuth(req);
  if (!gate.ok) return gate.response;

  const now = new Date();
  const due = await workspacesDueForErase(now);
  let erased = 0;
  const failed: { id: string; error: string }[] = [];
  for (const ws of due) {
    try {
      const res = await eraseWorkspace(ws.id);
      if (res.ok) erased++;
      else failed.push({ id: ws.id, error: res.error });
    } catch (err) {
      console.error(`[workspace-deletion] ${ws.id} failed:`, err);
      failed.push({ id: ws.id, error: err instanceof Error ? err.message : "unknown error" });
    }
  }
  return NextResponse.json({ ok: true, task: "workspace-deletion", due: due.length, erased, failed, ranAt: now.toISOString() });
}

// Vercel Cron sends GET: same auth, same body.
export async function GET(req: NextRequest) {
  return POST(req);
}

"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { CRON_JOBS } from "@/lib/admin/cron-run";
import { logAdminAction } from "@/lib/admin/audit";
import { originFromHeaders, siteOrigin } from "@/lib/site-url";

export type RunNowState = { ok: boolean; message: string } | null;

/**
 * "Run now" on /admin/jobs: calls the job's own route from the server with
 * CRON_SECRET, so the run goes through withCronRun and is recorded like a
 * scheduled one. The secret never reaches the browser.
 */
export async function runJobNowAction(_prev: RunNowState, form: FormData): Promise<RunNowState> {
  const session = await requireAdminAccess("platform:admin");
  const jobKey = String(form.get("job") ?? "");
  const job = CRON_JOBS.find((j) => j.job === jobKey);
  if (!job) return { ok: false, message: "Unknown job." };
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, message: "CRON_SECRET is not set on this deployment." };

  const origin = originFromHeaders(await headers()) ?? siteOrigin();
  let ok = false;
  let message: string;
  try {
    const res = await fetch(`${origin}${job.path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
    ok = res.ok;
    message = res.ok ? "Finished." : res.status === 404 ? "The job route does not exist yet." : `Failed with HTTP ${res.status}.`;
  } catch (err) {
    message = (err as Error)?.name === "TimeoutError" ? "Still running after 55 s; check the history shortly." : "Could not reach the job route.";
  }

  await logAdminAction({
    actor: { id: session?.user?.id, email: session?.user?.email },
    action: "job.run",
    targetType: "job",
    targetId: job.job,
    targetLabel: job.job,
    after: { ok, message },
  });
  revalidatePath("/admin/jobs");
  return { ok, message };
}

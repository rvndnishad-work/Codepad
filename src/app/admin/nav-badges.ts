import "server-only";
import { prisma } from "@/lib/prisma";
import { CRON_JOBS } from "@/lib/admin/cron-run";

type Badge = { count: number; tone: "warn" | "bad" };

/**
 * Small counts on sidebar rows: the moderation inbox and failing jobs.
 * Two cheap queries per admin page load; failures just hide the badge.
 */
export async function loadNavBadges(perms: ReadonlySet<string>): Promise<Record<string, Badge>> {
  const out: Record<string, Badge> = {};
  const isAdmin = perms.has("*") || perms.has("platform:admin");
  try {
    const [blogs, experiences, reports] = await Promise.all([
      prisma.blogPost.count({ where: { status: "PENDING" } }),
      prisma.prepExperience.count({ where: { status: "pending" } }),
      prisma.contentReport.count({ where: { status: "open" } }),
    ]);
    const inbox = blogs + experiences + reports;
    if (inbox > 0) out["/admin/inbox"] = { count: inbox, tone: "warn" };
  } catch {
    /* hide */
  }
  if (isAdmin) {
    try {
      const failing = await failingJobCount();
      if (failing > 0) out["/admin/jobs"] = { count: failing, tone: "bad" };
    } catch {
      /* hide */
    }
  }
  return out;
}

/** Jobs whose latest run failed. */
export async function failingJobCount(): Promise<number> {
  const latest = await prisma.cronRun.findMany({
    where: { startedAt: { gte: new Date(Date.now() - 2 * 24 * 3600_000) }, finishedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    distinct: ["job"],
    select: { job: true, ok: true },
  });
  const known = new Set(CRON_JOBS.map((j) => j.job));
  return latest.filter((r) => known.has(r.job) && r.ok === false).length;
}

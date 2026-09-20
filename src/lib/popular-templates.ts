import { prisma } from "@/lib/prisma";
import { templatesById } from "./templates";

/**
 * "Most Popular" playground ranking, driven by real usage instead of a
 * hardcoded list.
 *
 * Signal: saved snippets per template (each save = someone actually used that
 * playground), tie-broken by total snippet views (interest). Only ids that
 * exist in the template catalog survive — stale ids from deleted templates
 * can never surface. Shortfalls (cold-start DB, fewer than `limit` templates
 * in use) are backfilled from `FALLBACK_POPULAR_IDS` so the section always
 * renders a full row.
 */

export const FALLBACK_POPULAR_IDS = [
  "react",
  "python",
  "typescript",
  "empty-js",
] as const;

export type TemplateUsageRow = {
  template: string;
  snippets: number;
  views: number;
};

/** Pure ranking: most-saved first, most-viewed breaks ties. */
export function rankTemplateUsage(
  rows: TemplateUsageRow[],
  limit: number,
): string[] {
  return rows
    .filter((r) => templatesById[r.template])
    .sort((a, b) => b.snippets - a.snippets || b.views - a.views)
    .map((r) => r.template)
    .slice(0, limit);
}

/** Top `limit` template ids by usage, backfilled so the row is always full. */
export async function getPopularTemplateIds(limit = 4): Promise<string[]> {
  try {
    const rows = await prisma.snippet.groupBy({
      by: ["template"],
      _count: { _all: true },
      _sum: { viewCount: true },
    });
    const ranked = rankTemplateUsage(
      rows.map((r) => ({
        template: r.template,
        snippets: r._count._all,
        views: r._sum.viewCount ?? 0,
      })),
      limit,
    );
    const ids = [...ranked];
    for (const fb of FALLBACK_POPULAR_IDS) {
      if (ids.length >= limit) break;
      if (!ids.includes(fb)) ids.push(fb);
    }
    return ids.slice(0, limit);
  } catch {
    // Analytics must never break the page — fall back to the curated list.
    return [...FALLBACK_POPULAR_IDS].slice(0, limit);
  }
}

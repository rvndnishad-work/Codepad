import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { NavLinkConfig, DEFAULT_NAV_LINKS } from "./settings-constants";

/** Cache tag for the nav-links site setting — invalidated by updateNavLinks(). */
export const NAV_LINKS_TAG = "nav-links";

/**
 * Cross-request cached read of the `nav_links` site setting.
 *
 * `validatePageAccess()` runs on most public page routes, and it previously hit
 * the DB for this global config on *every* navigation — one more serial query
 * paying serverless round-trip latency on each page load. Nav links change only
 * when an admin saves them (updateNavLinks → revalidateTag below), so this is
 * safe to serve from Next's Data Cache with a short TTL as a backstop.
 */
export const getNavLinksCached = unstable_cache(
  async (): Promise<NavLinkConfig[]> => {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "nav_links" },
    });
    if (!setting) return DEFAULT_NAV_LINKS;

    const savedLinks = JSON.parse(setting.value) as NavLinkConfig[];
    // Merge saved status onto the current hardcoded link set so newly added
    // links in code show up even if they aren't in the saved blob yet.
    return DEFAULT_NAV_LINKS.map((def) => {
      const saved = savedLinks.find((s) => s.href === def.href);
      return saved ? { ...def, status: saved.status } : def;
    });
  },
  ["nav-links"],
  { tags: [NAV_LINKS_TAG], revalidate: 300 },
);

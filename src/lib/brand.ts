/**
 * The two product brands, one per domain (see src/lib/domains.ts):
 *
 * - DevPrep (devprep.academy): the developer site. Practice, challenges,
 *   interview questions, creators, portfolios.
 * - Intervutree (intervutree.com): the recruiter site. Workspaces, screenings,
 *   take-homes, interview rooms, candidate emails.
 *
 * Code that is clearly one side or the other imports DEVELOPER_BRAND or
 * RECRUITER_BRAND. Shared surfaces (sign-in, header, footer, 404, maintenance)
 * ask `currentBrand()` in src/lib/current-site.ts, which picks by the request
 * host and falls back to DevPrep when the domains are not split.
 *
 * Safe for client components: no server imports here.
 */
import type { SiteKind } from "./domains";

export type BrandKey = "devprep" | "intervutree";

export type Brand = {
  key: BrandKey;
  /** Display name: "DevPrep". */
  name: string;
  /** Bare domain, for copy like "devprep.academy/c/handle". */
  domain: string;
  /** Wordmark split into plain and coloured parts: ["dev", "prep"]. */
  wordmark: [string, string];
  /** Small caption under the wordmark in the header. */
  tagline: string;
  /** Which accent the brand uses: the developer yellow or the recruiter indigo. */
  tone: "accent" | "secondary" | "green";
  /**
   * Favicon set base path under /public/favicons: `${icon}-32.png`,
   * `-48.png`, `-192.png`, `-512.png`, `-apple-180.png` and `.ico`.
   */
  icon: string;
  /** Default <title> and description for pages that set none. */
  title: string;
  description: string;
};

export const DEVELOPER_BRAND: Brand = {
  key: "devprep",
  name: "DevPrep",
  domain: "devprep.academy",
  wordmark: ["devprep", ".academy"],
  tagline: "Practice · Learn · Build · Get hired",
  tone: "accent",
  icon: "/favicons/devprep",
  title: "DevPrep — Interview Prep, Coding Challenges & Developer Portfolio",
  description:
    "Practise on a real interview runtime: coding challenges with hidden tests, 1,600+ hand-written interview questions, AI mock interviews and a replay portfolio that shows how you actually work.",
};

export const RECRUITER_BRAND: Brand = {
  key: "intervutree",
  name: "Intervutree",
  domain: "intervutree.com",
  wordmark: ["intervu", "tree"],
  tagline: "Hiring runtime",
  tone: "green",
  icon: "/favicons/intervutree",
  title: "Intervutree — Technical Screening for Hiring Teams",
  description:
    "Send every applicant the same take-home or AI screening interview, grade each attempt on our servers with anti-cheat signals attached, and shortlist by evidence instead of arrival order.",
};

export const BRANDS: Record<BrandKey, Brand> = {
  devprep: DEVELOPER_BRAND,
  intervutree: RECRUITER_BRAND,
};

/** The brand for a site; DevPrep when the domains are not split (local dev, previews). */
export function brandForSite(site: SiteKind | null | undefined): Brand {
  return site === "recruiter" ? RECRUITER_BRAND : DEVELOPER_BRAND;
}

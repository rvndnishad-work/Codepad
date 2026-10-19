import "server-only";
import { headers } from "next/headers";
import { siteForRequestHost, type SiteKind } from "./domains";
import { brandForSite, type Brand } from "./brand";

/**
 * The site the current request is on: "developer", "recruiter", or null when
 * both sites share one domain (local dev, previews, before the split). Pages
 * and menus use it to hide the other site's links. Server only.
 */
export async function currentSite(): Promise<SiteKind | null> {
  try {
    const h = await headers();
    return siteForRequestHost(h.get("x-forwarded-host") ?? h.get("host"));
  } catch {
    return null;
  }
}

/** The brand for the current request: Intervutree on the recruiter domain, DevPrep otherwise. */
export async function currentBrand(): Promise<Brand> {
  return brandForSite(await currentSite());
}

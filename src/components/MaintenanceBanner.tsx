import { headers } from "next/headers";
import { bannerFor } from "@/lib/admin/maintenance-rules";
import { REQUEST_PATH_HEADER } from "@/lib/workspace/screening-defaults";
import MaintenanceBannerStrip from "./MaintenanceBannerStrip";

/**
 * Warns ahead of scheduled maintenance on the pages it covers. Reads the path
 * the proxy passes in a request header, finds the upcoming rule whose banner
 * lead time has started, and renders a dismissable strip. Renders nothing on
 * any error.
 */
export default async function MaintenanceBanner() {
  try {
    const asked = (await headers()).get(REQUEST_PATH_HEADER);
    if (!asked) return null;
    const pathname = asked.split("?")[0] || "/";
    const rule = await bannerFor(pathname);
    if (!rule || !rule.startsAt) return null;
    return (
      <MaintenanceBannerStrip
        id={`${rule.id}:${rule.startsAt.getTime()}`}
        message={rule.message}
        startsAt={rule.startsAt.toISOString()}
        endsAt={rule.endsAt?.toISOString() ?? null}
      />
    );
  } catch {
    return null;
  }
}

/**
 * Built-in video calls (LiveKit) as a workspace add-on.
 *
 * Admins switch it on in Billing. While it is on, a paid workspace carries a
 * flat monthly add-on on its Stripe subscription; switching it off removes
 * the item. During the free trial it works without a charge, so teams can try
 * it. Free workspaces keep using a meeting link.
 *
 * Pure: no database, no env. Safe to import from client components.
 */
import { growthToolsEnabled, type PlanFields } from "@/lib/billing/trial";

/** Flat add-on price per workspace. Annual subscriptions pay twelve months. */
export const VIDEO_ADDON_PRICE = { monthlyCents: 1500, annualCents: 18000 } as const;

/** Stripe metadata marking the add-on's subscription item. */
export const VIDEO_ADDON_KIND = "video_addon";

/** Plans that can switch video on: Growth, Enterprise and the trial. */
export function videoAddonAvailable(ws: PlanFields, now: Date = new Date()): boolean {
  return growthToolsEnabled(ws, now);
}

/** Built-in video is live for this workspace right now. */
export function videoCallsOn(ws: PlanFields & { videoEnabled: boolean }, now: Date = new Date()): boolean {
  return ws.videoEnabled && videoAddonAvailable(ws, now);
}

type ItemLike = { id: string; metadata?: Record<string, string> | null; price?: { metadata?: Record<string, string> | null } | null };

export function isVideoAddonItem(item: ItemLike): boolean {
  return item.metadata?.kind === VIDEO_ADDON_KIND || item.price?.metadata?.kind === VIDEO_ADDON_KIND;
}

/**
 * The seat line of a workspace subscription. Seat counts must never land on
 * the video add-on, whatever order Stripe lists the items in.
 */
export function seatItem<T extends ItemLike>(items: T[]): T | undefined {
  return items.find((i) => !isVideoAddonItem(i));
}

/** The add-on price for a subscription billed every `interval`. */
export function videoAddonCents(interval: "month" | "year"): number {
  return interval === "year" ? VIDEO_ADDON_PRICE.annualCents : VIDEO_ADDON_PRICE.monthlyCents;
}

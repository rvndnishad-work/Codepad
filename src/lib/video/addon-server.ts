/**
 * Switching the built-in video add-on on and off, and keeping the Stripe
 * subscription in step.
 *
 * A paid workspace carries the add-on as its own subscription item, tagged
 * with metadata { kind: VIDEO_ADDON_KIND } so seat changes never land on it.
 * During the trial, or on Enterprise without a Stripe subscription, the switch
 * works without a charge; the checkout adds the line if video is still on.
 *
 * Server only: reads the database and calls Stripe.
 */
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { VIDEO_ADDON_KIND, isVideoAddonItem, seatItem, videoAddonAvailable, videoAddonCents } from "./addon";

/** Fixed Stripe product for the add-on, created on first use. */
export const VIDEO_ADDON_PRODUCT_ID = "interviewpad_video_addon";

export type SetVideoAddonResult =
  | { ok: true; videoEnabled: boolean; billed: boolean }
  | { ok: false; error: string };

type Item = Stripe.SubscriptionItem;

/** Subscriptions that still bill. A cancelled one cannot take new items. */
const LIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete"]);

function stripeCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err ? String((err as { code?: unknown }).code) : undefined;
}

async function ensureAddonProduct(stripe: Stripe): Promise<string> {
  try {
    const product = await stripe.products.retrieve(VIDEO_ADDON_PRODUCT_ID);
    return product.id;
  } catch (err) {
    if (stripeCode(err) !== "resource_missing") throw err;
    const product = await stripe.products.create({
      id: VIDEO_ADDON_PRODUCT_ID,
      name: "Built-in video",
      description: "Video and audio calls inside the Interviewpad interview room, per workspace.",
      metadata: { kind: VIDEO_ADDON_KIND },
    });
    return product.id;
  }
}

/** The add-on items on a subscription: the stored one, plus any tagged one. */
function addonItems(items: Item[], storedId: string | null): Item[] {
  return items.filter((i) => i.id === storedId || isVideoAddonItem(i));
}

function intervalOf(item: Item | undefined): "month" | "year" {
  return item?.price?.recurring?.interval === "year" ? "year" : "month";
}

/**
 * How the workspace subscription bills, for the add-on price label. Falls back
 * to monthly when there is no subscription, no Stripe key, or Stripe fails.
 */
export async function subscriptionInterval(subscriptionId: string | null): Promise<"month" | "year"> {
  if (!subscriptionId || !process.env.STRIPE_SECRET_KEY) return "month";
  try {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    return intervalOf(seatItem(sub.items.data));
  } catch {
    return "month";
  }
}

export async function setVideoAddon({
  workspaceId,
  on,
  actorUserId,
  actorEmail = null,
}: {
  workspaceId: string;
  on: boolean;
  actorUserId: string | null;
  actorEmail?: string | null;
}): Promise<SetVideoAddonResult> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      videoEnabled: true,
      videoEnabledAt: true,
      videoAddonItemId: true,
    },
  });
  if (!ws) return { ok: false, error: "Workspace not found." };

  const stripeReady = Boolean(ws.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY);
  const audit = (action: typeof WORKSPACE_AUDIT_ACTIONS.VIDEO_ADDON_ENABLED | typeof WORKSPACE_AUDIT_ACTIONS.VIDEO_ADDON_DISABLED, meta: Record<string, unknown>) =>
    writeWorkspaceAuditEntry({ workspaceId, actorUserId, actorEmail, action, targetType: "workspace", targetId: workspaceId, meta });

  if (on) {
    if (!videoAddonAvailable(ws)) {
      return { ok: false, error: "Built-in video is part of Growth and Enterprise. Choose Growth to switch it on." };
    }

    let itemId: string | null = null;
    let interval: "month" | "year" | null = null;
    if (stripeReady) {
      try {
        const stripe = getStripe();
        const sub = await stripe.subscriptions.retrieve(ws.stripeSubscriptionId!);
        if (LIVE_STATUSES.has(sub.status)) {
          const items = sub.items.data;
          interval = intervalOf(seatItem(items));
          const existing = addonItems(items, ws.videoAddonItemId)[0];
          if (existing) {
            itemId = existing.id;
          } else {
            const product = await ensureAddonProduct(stripe);
            const item = await stripe.subscriptionItems.create({
              subscription: sub.id,
              price_data: { currency: "usd", product, unit_amount: videoAddonCents(interval), recurring: { interval } },
              quantity: 1,
              metadata: { kind: VIDEO_ADDON_KIND },
              proration_behavior: "create_prorations",
            });
            itemId = item.id;
          }
        }
      } catch (err) {
        console.error("[video-addon] Stripe add failed:", err);
        // Nothing is saved, so video stays as it was.
        return { ok: false, error: "Could not add built-in video to your subscription. Nothing was charged. Try again in a moment." };
      }
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        videoEnabled: true,
        videoEnabledAt: ws.videoEnabled && ws.videoEnabledAt ? ws.videoEnabledAt : new Date(),
        videoAddonItemId: itemId,
      },
    });
    if (!ws.videoEnabled) await audit(WORKSPACE_AUDIT_ACTIONS.VIDEO_ADDON_ENABLED, { billed: Boolean(itemId), interval });
    return { ok: true, videoEnabled: true, billed: Boolean(itemId) };
  }

  // Switching off. Remove every add-on line first, so the workspace is never
  // billed for video that is switched off.
  let removed = 0;
  if (stripeReady) {
    try {
      const stripe = getStripe();
      let items: Item[] = [];
      try {
        const sub = await stripe.subscriptions.retrieve(ws.stripeSubscriptionId!);
        items = sub.items.data;
      } catch (err) {
        if (stripeCode(err) !== "resource_missing") throw err;
      }
      for (const item of addonItems(items, ws.videoAddonItemId)) {
        await stripe.subscriptionItems.del(item.id, { proration_behavior: "create_prorations" });
        removed++;
      }
    } catch (err) {
      console.error("[video-addon] Stripe remove failed:", err);
      return { ok: false, error: "Could not remove built-in video from your subscription. It is still on. Try again in a moment." };
    }
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { videoEnabled: false, videoEnabledAt: null, videoAddonItemId: null },
  });
  if (ws.videoEnabled) await audit(WORKSPACE_AUDIT_ACTIONS.VIDEO_ADDON_DISABLED, { billed: removed > 0 });
  return { ok: true, videoEnabled: false, billed: false };
}

/**
 * After a Growth checkout completes: find the "Built-in video" line the
 * checkout added, tag it with the add-on metadata and remember its id.
 * Checkout line items cannot carry item metadata, so the line is found by its
 * product (name or metadata) and, failing that, by its price.
 */
export async function linkVideoAddonAfterCheckout(workspaceId: string, subscriptionId: string): Promise<void> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { videoEnabled: true, videoAddonItemId: true },
  });
  if (!ws?.videoEnabled || ws.videoAddonItemId || !process.env.STRIPE_SECRET_KEY) return;

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price.product"] });
  const items = sub.items.data;
  const found = findCheckoutAddonItem(items);
  if (!found) return;
  if (!isVideoAddonItem(found)) {
    await stripe.subscriptionItems.update(found.id, { metadata: { kind: VIDEO_ADDON_KIND } });
  }
  await prisma.workspace.update({ where: { id: workspaceId }, data: { videoAddonItemId: found.id } });
}

type CheckoutItemLike = {
  id: string;
  quantity?: number | null;
  metadata?: Record<string, string> | null;
  price?: {
    unit_amount?: number | null;
    recurring?: { interval?: string } | null;
    product?: string | { id: string; name?: string; metadata?: Record<string, string> | null } | null;
    metadata?: Record<string, string> | null;
  } | null;
};

/** Pure: the add-on line among a new subscription's items, if any. */
export function findCheckoutAddonItem<T extends CheckoutItemLike>(items: T[]): T | undefined {
  if (items.length < 2) return items.find((i) => isVideoAddonItem(i));
  const tagged = items.find((i) => isVideoAddonItem(i));
  if (tagged) return tagged;
  const byProduct = items.find((i) => {
    const p = i.price?.product;
    if (!p || typeof p === "string") return false;
    return p.metadata?.kind === VIDEO_ADDON_KIND || p.name === "Built-in video";
  });
  if (byProduct) return byProduct;
  // Fallback: the single-quantity line priced like the add-on.
  const candidates = items.filter((i) => {
    const interval = i.price?.recurring?.interval === "year" ? "year" : "month";
    return (i.quantity ?? 1) === 1 && i.price?.unit_amount === videoAddonCents(interval);
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}

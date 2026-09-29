import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  ws: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  audits: [] as { action: string; meta: Record<string, unknown> }[],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(async () => db.ws),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        db.updates.push(data);
        db.ws = { ...db.ws, ...data };
        return db.ws;
      }),
    },
  },
}));

vi.mock("@/lib/workspace-audit", () => ({
  WORKSPACE_AUDIT_ACTIONS: { VIDEO_ADDON_ENABLED: "VIDEO_ADDON_ENABLED", VIDEO_ADDON_DISABLED: "VIDEO_ADDON_DISABLED" },
  writeWorkspaceAuditEntry: vi.fn(async (e: { action: string; meta: Record<string, unknown> }) => {
    db.audits.push({ action: e.action, meta: e.meta });
  }),
}));

const stripe = vi.hoisted(() => ({
  subscriptions: { retrieve: vi.fn() },
  subscriptionItems: { create: vi.fn(), del: vi.fn(), update: vi.fn() },
  products: { retrieve: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/stripe", () => ({ getStripe: () => stripe }));

// Effective prices: defaults unless a test sets an admin override.
const pricing = vi.hoisted(() => ({ overrides: {} as Record<string, unknown> }));
vi.mock("@/lib/billing/pricing-copy-store", async () => {
  const { resolvePrices } = await import("@/lib/billing/prices");
  return { getEffectivePricing: vi.fn(async () => resolvePrices(pricing.overrides)) };
});

import { findCheckoutAddonItem, setVideoAddon, VIDEO_ADDON_PRODUCT_ID } from "@/lib/video/addon-server";
import { seatItem, VIDEO_ADDON_KIND } from "@/lib/video/addon";

const seat = (interval: "month" | "year" = "month") => ({
  id: "si_seat",
  quantity: 4,
  metadata: {},
  price: { unit_amount: 4900, recurring: { interval }, metadata: {} },
});
const addon = { id: "si_video", quantity: 1, metadata: { kind: VIDEO_ADDON_KIND }, price: { unit_amount: 1500, recurring: { interval: "month" }, metadata: {} } };

function growth(extra: Record<string, unknown> = {}) {
  return {
    id: "ws1",
    planName: "GROWTH",
    trialEndsAt: null,
    stripeSubscriptionId: "sub_1",
    videoEnabled: false,
    videoEnabledAt: null,
    videoAddonItemId: null,
    ...extra,
  };
}

function subWith(items: unknown[]) {
  stripe.subscriptions.retrieve.mockResolvedValue({ id: "sub_1", status: "active", items: { data: items } });
}

beforeEach(() => {
  vi.clearAllMocks();
  pricing.overrides = {};
  db.updates = [];
  db.audits = [];
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  stripe.products.retrieve.mockResolvedValue({ id: VIDEO_ADDON_PRODUCT_ID });
  stripe.subscriptionItems.create.mockResolvedValue({ id: "si_new" });
  stripe.subscriptionItems.del.mockResolvedValue({ id: "si_video", deleted: true });
});

describe("setVideoAddon on", () => {
  it("adds a prorated add-on item priced for the seat interval and stores its id", async () => {
    db.ws = growth();
    subWith([seat("year")]);
    const res = await setVideoAddon({ workspaceId: "ws1", on: true, actorUserId: "u1" });
    expect(res).toEqual({ ok: true, videoEnabled: true, billed: true });
    expect(stripe.subscriptionItems.create).toHaveBeenCalledWith({
      subscription: "sub_1",
      price_data: { currency: "usd", product: VIDEO_ADDON_PRODUCT_ID, unit_amount: 18000, recurring: { interval: "year" } },
      quantity: 1,
      metadata: { kind: VIDEO_ADDON_KIND },
      proration_behavior: "create_prorations",
    });
    expect(db.ws).toMatchObject({ videoEnabled: true, videoAddonItemId: "si_new" });
    expect(db.ws!.videoEnabledAt).toBeInstanceOf(Date);
    expect(db.audits).toEqual([{ action: "VIDEO_ADDON_ENABLED", meta: { billed: true, interval: "year" } }]);
  });

  it("creates the product when Stripe does not have it yet", async () => {
    db.ws = growth();
    subWith([seat()]);
    stripe.products.retrieve.mockRejectedValue(Object.assign(new Error("No such product"), { code: "resource_missing" }));
    stripe.products.create.mockResolvedValue({ id: VIDEO_ADDON_PRODUCT_ID });
    await setVideoAddon({ workspaceId: "ws1", on: true, actorUserId: "u1" });
    expect(stripe.products.create).toHaveBeenCalledWith(expect.objectContaining({ id: VIDEO_ADDON_PRODUCT_ID, name: "Built-in video" }));
    expect(stripe.subscriptionItems.create.mock.calls[0][0].price_data.unit_amount).toBe(1500);
  });

  it("prices a newly added line at the admin override", async () => {
    pricing.overrides = { videoAddon: { monthlyCents: 2500, annualCents: 24000 } };
    db.ws = growth();
    subWith([seat("year")]);
    await setVideoAddon({ workspaceId: "ws1", on: true, actorUserId: "u1" });
    expect(stripe.subscriptionItems.create.mock.calls[0][0].price_data.unit_amount).toBe(24000);
  });

  it("is idempotent: reuses an add-on item already on the subscription", async () => {
    db.ws = growth({ videoEnabled: true, videoEnabledAt: new Date("2026-09-01T00:00:00Z"), videoAddonItemId: null });
    subWith([addon, seat()]);
    const res = await setVideoAddon({ workspaceId: "ws1", on: true, actorUserId: "u1" });
    expect(res.ok).toBe(true);
    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled();
    expect(db.ws).toMatchObject({ videoAddonItemId: "si_video", videoEnabledAt: new Date("2026-09-01T00:00:00Z") });
    expect(db.audits).toEqual([]);
  });

  it("reuses the stored item id even without metadata", async () => {
    db.ws = growth({ videoAddonItemId: "si_stored" });
    subWith([seat(), { id: "si_stored", metadata: {}, price: { unit_amount: 1500, recurring: { interval: "month" } } }]);
    await setVideoAddon({ workspaceId: "ws1", on: true, actorUserId: "u1" });
    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled();
    expect(db.ws).toMatchObject({ videoEnabled: true, videoAddonItemId: "si_stored" });
  });

  it("leaves video off and says so when Stripe fails", async () => {
    db.ws = growth();
    subWith([seat()]);
    stripe.subscriptionItems.create.mockRejectedValue(new Error("card_declined"));
    const res = await setVideoAddon({ workspaceId: "ws1", on: true, actorUserId: "u1" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Could not add built-in video/);
    expect(db.updates).toEqual([]);
    expect(db.ws!.videoEnabled).toBe(false);
  });

  it("switches on without Stripe during the trial", async () => {
    db.ws = growth({ planName: "FREE", stripeSubscriptionId: null, trialEndsAt: new Date(Date.now() + 86400_000) });
    const res = await setVideoAddon({ workspaceId: "ws1", on: true, actorUserId: "u1" });
    expect(res).toEqual({ ok: true, videoEnabled: true, billed: false });
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(db.ws).toMatchObject({ videoEnabled: true, videoAddonItemId: null });
  });

  it("switches on without Stripe for Enterprise with no subscription", async () => {
    db.ws = growth({ planName: "ENTERPRISE", stripeSubscriptionId: null });
    const res = await setVideoAddon({ workspaceId: "ws1", on: true, actorUserId: "u1" });
    expect(res).toEqual({ ok: true, videoEnabled: true, billed: false });
  });

  it("refuses on Free after the trial", async () => {
    db.ws = growth({ planName: "FREE", stripeSubscriptionId: null, trialEndsAt: new Date(Date.now() - 1000) });
    const res = await setVideoAddon({ workspaceId: "ws1", on: true, actorUserId: "u1" });
    expect(res.ok).toBe(false);
    expect(db.updates).toEqual([]);
  });
});

describe("setVideoAddon off", () => {
  it("deletes the add-on item with a proration credit and clears the id", async () => {
    db.ws = growth({ videoEnabled: true, videoEnabledAt: new Date(), videoAddonItemId: "si_video" });
    subWith([seat(), addon]);
    const res = await setVideoAddon({ workspaceId: "ws1", on: false, actorUserId: "u1" });
    expect(res).toEqual({ ok: true, videoEnabled: false, billed: false });
    expect(stripe.subscriptionItems.del).toHaveBeenCalledWith("si_video", { proration_behavior: "create_prorations" });
    expect(stripe.subscriptionItems.del).toHaveBeenCalledTimes(1);
    expect(db.ws).toMatchObject({ videoEnabled: false, videoAddonItemId: null });
    expect(db.audits).toEqual([{ action: "VIDEO_ADDON_DISABLED", meta: { billed: true } }]);
  });

  it("keeps video on when Stripe cannot remove the item", async () => {
    db.ws = growth({ videoEnabled: true, videoAddonItemId: "si_video" });
    subWith([seat(), addon]);
    stripe.subscriptionItems.del.mockRejectedValue(new Error("boom"));
    const res = await setVideoAddon({ workspaceId: "ws1", on: false, actorUserId: "u1" });
    expect(res.ok).toBe(false);
    expect(db.ws!.videoEnabled).toBe(true);
  });

  it("switches off on trial without touching Stripe", async () => {
    db.ws = growth({ planName: "FREE", stripeSubscriptionId: null, trialEndsAt: new Date(Date.now() + 86400_000), videoEnabled: true });
    const res = await setVideoAddon({ workspaceId: "ws1", on: false, actorUserId: "u1" });
    expect(res.ok).toBe(true);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(db.ws!.videoEnabled).toBe(false);
  });
});

describe("seatItem", () => {
  it("skips the video add-on whatever the order", () => {
    expect(seatItem([addon, seat()])?.id).toBe("si_seat");
    expect(seatItem([seat(), addon])?.id).toBe("si_seat");
  });
  it("recognises an add-on tagged on its price", () => {
    const priced = { id: "si_p", price: { metadata: { kind: VIDEO_ADDON_KIND } } };
    expect(seatItem([priced, { id: "si_seat" }])?.id).toBe("si_seat");
  });
  it("returns undefined when only the add-on is present", () => {
    expect(seatItem([addon])).toBeUndefined();
  });
});

describe("findCheckoutAddonItem", () => {
  const untaggedAddon = (amount: number, interval: "month" | "year") => ({
    id: "si_checkout",
    quantity: 1,
    metadata: {},
    price: { unit_amount: amount, recurring: { interval }, product: "prod_x", metadata: {} },
  });
  it("finds the line by its product name", () => {
    const item = { ...untaggedAddon(1500, "month"), price: { ...untaggedAddon(1500, "month").price, product: { id: "prod_x", name: "Built-in video" } } };
    expect(findCheckoutAddonItem([seat(), item])?.id).toBe("si_checkout");
  });
  it("finds the line by product metadata or the add-on product id, whatever it costs", () => {
    const tagged = { ...untaggedAddon(2500, "month"), price: { ...untaggedAddon(2500, "month").price, product: { id: "prod_y", metadata: { kind: VIDEO_ADDON_KIND } } } };
    expect(findCheckoutAddonItem([seat(), tagged])?.id).toBe("si_checkout");
    const byId = { ...untaggedAddon(9900, "year"), price: { ...untaggedAddon(9900, "year").price, product: VIDEO_ADDON_PRODUCT_ID } };
    expect(findCheckoutAddonItem([byId, seat("year")])?.id).toBe("si_checkout");
  });
  it("never identifies the add-on by amount", () => {
    // Priced exactly like the default add-on, but nothing marks it as one.
    expect(findCheckoutAddonItem([untaggedAddon(18000, "year"), seat("year")])).toBeUndefined();
    expect(findCheckoutAddonItem([seat(), untaggedAddon(1500, "month")])).toBeUndefined();
  });
  it("never picks the only item on a seat-only subscription", () => {
    expect(findCheckoutAddonItem([seat()])).toBeUndefined();
  });
});

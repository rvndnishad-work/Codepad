import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ row: null as { value: string } | null, fail: false }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteSetting: {
      findUnique: vi.fn(async () => {
        if (db.fail) throw new Error("db down");
        return db.row;
      }),
    },
  },
}));

import { DEFAULT_PRICES, findCreditPack, resolvePrices, sanitizePriceOverrides } from "@/lib/billing/prices";
import { getEffectivePricing, getPricingCopy } from "@/lib/billing/pricing-copy-store";
import { checkoutSeatChargeCents } from "@/lib/billing/plans";
import { videoAddonCents } from "@/lib/video/addon";
import { buildPublicPricing } from "@/lib/billing/public-pricing";

beforeEach(() => {
  db.row = null;
  db.fail = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sanitizePriceOverrides", () => {
  it("keeps valid integer prices", () => {
    const { prices, errors } = sanitizePriceOverrides({
      growth: { monthlyCents: 5900, annualMonthlyCents: 4500 },
      packs: { "team-50": { credits: 60, priceCents: 14900 } },
      videoAddon: { monthlyCents: 2000, annualCents: 20000 },
    });
    expect(errors).toEqual([]);
    expect(prices).toEqual({
      growth: { monthlyCents: 5900, annualMonthlyCents: 4500 },
      packs: { "team-50": { credits: 60, priceCents: 14900 } },
      videoAddon: { monthlyCents: 2000, annualCents: 20000 },
    });
  });

  it("rejects non-integers and out-of-bounds values", () => {
    const { prices, errors } = sanitizePriceOverrides({
      growth: { monthlyCents: 49.5 },
      packs: { "starter-10": { credits: 0, priceCents: 99 }, "team-50": { credits: 100_001, priceCents: 10_000_001 } },
      videoAddon: { monthlyCents: "1500", annualCents: -1 },
    });
    expect(prices).toEqual({});
    expect(errors).toHaveLength(7);
  });

  it("accepts the bounds exactly", () => {
    const { prices, errors } = sanitizePriceOverrides({
      growth: { monthlyCents: 1_000_000, annualMonthlyCents: 100 },
      packs: { "starter-10": { credits: 1, priceCents: 100 }, "team-50": { credits: 100_000, priceCents: 10_000_000 } },
    });
    expect(errors).toEqual([]);
    expect(prices.packs?.["team-50"]).toEqual({ credits: 100_000, priceCents: 10_000_000 });
  });

  it("refuses a yearly seat rate above the monthly rate, including against the default", () => {
    expect(sanitizePriceOverrides({ growth: { monthlyCents: 3000, annualMonthlyCents: 4000 } }).prices).toEqual({});
    // Default yearly rate is $39: a $30 monthly price alone would put yearly above monthly.
    const r = sanitizePriceOverrides({ growth: { monthlyCents: 3000 } });
    expect(r.prices).toEqual({});
    expect(r.errors[0]).toMatch(/yearly/);
  });

  it("drops unknown pack ids and fields", () => {
    const { prices } = sanitizePriceOverrides({ packs: { "free-lunch": { credits: 5, priceCents: 100 } }, starter: { monthlyCents: 100 } });
    expect(prices).toEqual({});
  });
});

describe("resolvePrices", () => {
  it("is the defaults with no overrides", () => {
    expect(resolvePrices(undefined)).toEqual(DEFAULT_PRICES);
    expect(resolvePrices({ growth: { monthlyCents: 1 } })).toEqual(DEFAULT_PRICES);
  });

  it("overrides only the fields given", () => {
    const p = resolvePrices({ growth: { monthlyCents: 5900 }, packs: { "team-50": { credits: 60 } } });
    expect(p.growth).toEqual({ monthlyCents: 5900, annualMonthlyCents: DEFAULT_PRICES.growth.annualMonthlyCents });
    const team = findCreditPack(p, "team-50")!;
    expect(team.credits).toBe(60);
    expect(team.priceCents).toBe(findCreditPack(DEFAULT_PRICES, "team-50")!.priceCents);
    expect(team.sublabel).toBe("60 screenings");
    expect(p.videoAddon).toEqual(DEFAULT_PRICES.videoAddon);
  });
});

describe("what checkout charges follows the override", () => {
  const prices = resolvePrices({
    growth: { monthlyCents: 5900, annualMonthlyCents: 4500 },
    videoAddon: { monthlyCents: 2000, annualCents: 21000 },
  });

  it("charges the overridden seat price, twelve months at once on yearly billing", () => {
    expect(checkoutSeatChargeCents("GROWTH", "monthly", prices.growth)).toBe(5900);
    expect(checkoutSeatChargeCents("GROWTH", "annual", prices.growth)).toBe(4500 * 12);
    // Legacy Starter is not overridable.
    expect(checkoutSeatChargeCents("STARTER", "monthly", prices.growth)).toBe(1900);
  });

  it("charges the overridden video add-on for the interval", () => {
    expect(videoAddonCents("month", prices.videoAddon)).toBe(2000);
    expect(videoAddonCents("year", prices.videoAddon)).toBe(21000);
  });

  it("shows the same numbers on the public page", () => {
    const pub = buildPublicPricing(prices);
    const growth = pub.plans.find((p) => p.key === "GROWTH")!;
    expect(growth.price).toEqual({ monthly: "$59", annual: "$45" });
    expect(pub.annualSavingPercent).toBe(24);
  });
});

describe("getEffectivePricing", () => {
  it("returns the defaults when nothing is stored", async () => {
    expect(await getEffectivePricing()).toEqual(DEFAULT_PRICES);
  });

  it("falls back to the defaults when the database fails", async () => {
    db.fail = true;
    expect(await getEffectivePricing()).toEqual(DEFAULT_PRICES);
    expect(await getPricingCopy()).toEqual({});
  });

  it("falls back to the defaults when the stored JSON is broken", async () => {
    db.row = { value: "{not json" };
    expect(await getEffectivePricing()).toEqual(DEFAULT_PRICES);
  });

  it("applies stored overrides and ignores invalid ones", async () => {
    db.row = {
      value: JSON.stringify({
        plans: { GROWTH: { name: "Team" } },
        prices: { growth: { monthlyCents: 6900 }, packs: { "starter-10": { priceCents: 5 } } },
      }),
    };
    const p = await getEffectivePricing();
    expect(p.growth.monthlyCents).toBe(6900);
    expect(findCreditPack(p, "starter-10")!.priceCents).toBe(findCreditPack(DEFAULT_PRICES, "starter-10")!.priceCents);
    expect(await getPricingCopy()).toEqual({ plans: { GROWTH: { name: "Team" } } });
  });
});

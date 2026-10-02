import { describe, expect, it } from "vitest";
import { pathLabel, pricingDiff, showValue } from "./diff";
import { resolveStarterPrice, sanitizeStarterOverride, serializePricingSettings, starterSeatChargeCents } from "@/lib/billing/pricing-copy-store";

describe("pricingDiff", () => {
  it("lists price changes in dollars, prices first", () => {
    const before = { plans: { GROWTH: { name: "Growth" } }, prices: { growth: { monthlyCents: 4900 } } };
    const after = { plans: { GROWTH: { name: "Team" } }, prices: { growth: { monthlyCents: 4500 }, videoAddon: { annualCents: 15050 } } };
    const d = pricingDiff(before, after);
    expect(d.map((l) => [l.label, l.from, l.to])).toEqual([
      ["Growth seat monthly", "$49", "$45"],
      ["Video add-on yearly", "default", "$150.50"],
      ["Plan GROWTH, name", "“Growth”", "“Team”"],
    ]);
  });
  it("is empty when nothing changed", () => {
    expect(pricingDiff({ a: 1 }, { a: 1 })).toEqual([]);
  });
  it("shows a reset as everything going back to default", () => {
    const d = pricingDiff({ starter: { monthlyCents: 2500 } }, {});
    expect(d).toEqual([{ path: "starter.monthlyCents", label: "Starter seat monthly", from: "$25", to: "default" }]);
  });
  it("labels and values", () => {
    expect(pathLabel("prices.packs.small.priceCents")).toBe("Pack small, price");
    expect(showValue("plans.FREE.includes", ["a", "b"])).toBe("2 lines");
    expect(showValue("packBadges.small", null)).toBe("none");
  });
});

describe("Starter price override", () => {
  it("keeps valid overrides and resolves over the defaults", () => {
    const { starter, errors } = sanitizeStarterOverride({ monthlyCents: 2500 });
    expect(errors).toEqual([]);
    expect(resolveStarterPrice(starter)).toEqual({ monthlyCents: 2500, annualMonthlyCents: 1500 });
  });
  it("rejects a yearly rate above the monthly one", () => {
    const r = sanitizeStarterOverride({ monthlyCents: 1000, annualMonthlyCents: 1200 });
    expect(r.errors.length).toBe(1);
    expect(r.starter).toEqual({});
  });
  it("rejects junk", () => {
    expect(sanitizeStarterOverride({ monthlyCents: 12.5 }).errors.length).toBe(1);
    expect(sanitizeStarterOverride({ monthlyCents: 50 }).errors.length).toBe(1);
  });
  it("charges twelve discounted months on annual", () => {
    expect(starterSeatChargeCents("annual", { monthlyCents: 1900, annualMonthlyCents: 1500 })).toBe(18000);
    expect(starterSeatChargeCents("monthly", { monthlyCents: 1900, annualMonthlyCents: 1500 })).toBe(1900);
  });
  it("serializes starter next to the wording and prices, null when all default", () => {
    expect(serializePricingSettings({ copy: {}, prices: {}, starter: {} })).toBeNull();
    expect(JSON.parse(serializePricingSettings({ copy: {}, prices: {}, starter: { monthlyCents: 2000 } })!)).toEqual({ starter: { monthlyCents: 2000 } });
  });
});

import { describe, expect, it } from "vitest";
import { applyPricingCopy, sanitizePricingCopy, PRICING_COPY_LIMITS } from "@/lib/billing/pricing-copy";
import { PUBLIC_CREDIT_PACKS, PUBLIC_PLANS } from "@/lib/billing/public-pricing";
import { resolvePrices } from "@/lib/billing/prices";

const priceFields = (p: (typeof PUBLIC_PLANS)[number]) => ({ price: p.price, unit: p.unit, note: p.note, seats: p.seats, cta: p.cta });

describe("pricing copy never changes prices", () => {
  it("ignores price, unit, note, seats and cta even when the input sets them", () => {
    const hostile = {
      plans: {
        GROWTH: {
          name: "Pro",
          price: { monthly: "$1", annual: "$1" },
          unit: { monthly: "forever", annual: "forever" },
          note: { monthly: "free!", annual: "free!" },
          seats: "Unlimited",
          cta: "free",
        },
      },
      packBadges: { "team-50": "Best value" },
      packs: [{ id: "team-50", price: "$1", credits: 99999, perCredit: "$0.00" }],
    };
    const { plans, packs } = applyPricingCopy(hostile as never);
    const growth = plans.find((p) => p.key === "GROWTH")!;
    const base = PUBLIC_PLANS.find((p) => p.key === "GROWTH")!;
    expect(growth.name).toBe("Pro");
    expect(priceFields(growth)).toEqual(priceFields(base));
    packs.forEach((p, i) => {
      const b = PUBLIC_CREDIT_PACKS[i];
      expect({ credits: p.credits, price: p.price, perCredit: p.perCredit }).toEqual({ credits: b.credits, price: b.price, perCredit: b.perCredit });
    });
  });

  it("keeps the defaults when there is no copy", () => {
    const { plans, packs } = applyPricingCopy({});
    expect(plans).toEqual(PUBLIC_PLANS);
    expect(packs).toEqual(PUBLIC_CREDIT_PACKS);
  });

  it("shows the effective prices it is given, with the wording laid over", () => {
    const prices = resolvePrices({ growth: { monthlyCents: 5900, annualMonthlyCents: 4900 } });
    const { plans } = applyPricingCopy({ plans: { GROWTH: { name: "Team" } } }, prices);
    const growth = plans.find((p) => p.key === "GROWTH")!;
    expect(growth.name).toBe("Team");
    expect(growth.price).toEqual({ monthly: "$59", annual: "$49" });
  });
});

describe("sanitizePricingCopy", () => {
  it("trims, caps lengths and drops empty strings", () => {
    const long = "x".repeat(500);
    const out = sanitizePricingCopy({
      plans: {
        FREE: { name: `  ${long}  `, audience: long, includes: ["  a  ", "", "   ", long] },
        GROWTH: { name: "   ", audience: "" },
      },
    });
    expect(out.plans?.FREE?.name).toHaveLength(PRICING_COPY_LIMITS.name);
    expect(out.plans?.FREE?.audience).toHaveLength(PRICING_COPY_LIMITS.audience);
    expect(out.plans?.FREE?.includes).toEqual(["a", "x".repeat(PRICING_COPY_LIMITS.include)]);
    expect(out.plans?.GROWTH).toBeUndefined();
  });

  it("keeps at most 8 includes and drops duplicates", () => {
    const lines = Array.from({ length: 12 }, (_, i) => `line ${i}`);
    const out = sanitizePricingCopy({ plans: { GROWTH: { includes: ["line 0", ...lines] } } });
    expect(out.plans?.GROWTH?.includes).toEqual(lines.slice(0, PRICING_COPY_LIMITS.includes));
  });

  it("drops unknown plan keys, unknown pack ids and unknown fields", () => {
    const out = sanitizePricingCopy({
      plans: { STARTER: { name: "Old" }, __proto__: { name: "x" }, GROWTH: { name: "Growth+", bogus: 1 } },
      packBadges: { "made-up": "Hot", "team-50": "Hot" },
      other: true,
    });
    expect(out).toEqual({ plans: { GROWTH: { name: "Growth+" } }, packBadges: { "team-50": "Hot" } });
  });

  it("caps badges at 24 characters and keeps null (hide badge)", () => {
    const out = sanitizePricingCopy({ packBadges: { "starter-10": "y".repeat(40), "team-50": null, "scale-200": "  " } });
    expect(out.packBadges).toEqual({ "starter-10": "y".repeat(PRICING_COPY_LIMITS.badge), "team-50": null });
  });

  it("returns {} for garbage", () => {
    expect(sanitizePricingCopy(null)).toEqual({});
    expect(sanitizePricingCopy("x")).toEqual({});
    expect(sanitizePricingCopy({ plans: [], packBadges: "x" })).toEqual({});
  });
});

describe("recommended plan", () => {
  it("keeps only the first recommended plan", () => {
    const out = sanitizePricingCopy({ plans: { FREE: { recommended: true }, GROWTH: { recommended: true }, ENTERPRISE: { recommended: true } } });
    expect(out.plans).toEqual({ FREE: { recommended: true } });
  });

  it("makes the chosen plan the only recommended one", () => {
    const { plans } = applyPricingCopy({ plans: { ENTERPRISE: { recommended: true } } });
    expect(plans.filter((p) => p.recommended).map((p) => p.key)).toEqual(["ENTERPRISE"]);
  });

  it("keeps the default when no plan is recommended in the copy", () => {
    const { plans } = applyPricingCopy({ plans: { FREE: { recommended: false, name: "Starter" } } });
    expect(plans.filter((p) => p.recommended).map((p) => p.key)).toEqual(["GROWTH"]);
  });
});

describe("pack badges", () => {
  it("replaces, hides or keeps the default badge", () => {
    const { packs } = applyPricingCopy({ packBadges: { "starter-10": "Try it", "team-50": null } });
    const byId = Object.fromEntries(packs.map((p) => [p.id, p.badge]));
    expect(byId["starter-10"]).toBe("Try it");
    expect(byId["team-50"]).toBeNull();
    expect(byId["scale-200"]).toBe(PUBLIC_CREDIT_PACKS.find((p) => p.id === "scale-200")!.badge);
  });
});

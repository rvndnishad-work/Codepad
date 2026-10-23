import { describe, expect, it } from "vitest";
import {
  CATALOG_PLANS,
  DEFAULT_CATALOG,
  annualMonthlyCents,
  annualSavingPercent,
  creditsForPeriod,
  findCatalogPlan,
  formatCreditPrice,
  ladderIssues,
  packCentsPerCredit,
  planCentsPerCredit,
  planChargeCents,
  resolveCatalog,
  sanitizeCatalogOverrides,
} from "./catalog";

const plan = (key: string) => {
  const p = findCatalogPlan(DEFAULT_CATALOG, key);
  if (!p) throw new Error(`no plan ${key}`);
  return p;
};

describe("default catalogue", () => {
  it("has the agreed prices, credits and caps", () => {
    expect(DEFAULT_CATALOG.plans.map((p) => [p.key, p.monthlyCents, p.annualCents, p.creditsPerMonth, p.workspaceLimit, p.seatsPerWorkspace])).toEqual([
      ["BASIC", 2000, 20000, 50, 1, 3],
      ["GROWTH", 5000, 50000, 150, 3, 10],
      ["TEAMS", 10000, 100000, 400, 10, 25],
    ]);
    expect(DEFAULT_CATALOG.topups.map((p) => [p.id, p.credits, p.priceCents])).toEqual([
      ["topup-25", 25, 1500],
      ["topup-100", 100, 5000],
      ["topup-300", 300, 13500],
    ]);
  });

  it("keeps Enterprise custom and Pilot admin-only", () => {
    expect(CATALOG_PLANS.ENTERPRISE.monthlyCents).toBeNull();
    expect(CATALOG_PLANS.ENTERPRISE.workspaceLimit).toBeNull();
    expect(CATALOG_PLANS.PILOT.monthlyCents).toBeNull();
    expect(CATALOG_PLANS.PILOT.workspaceLimit).toBe(1);
  });

  it("only Growth and up get the Growth tools", () => {
    expect(DEFAULT_CATALOG.plans.map((p) => p.growthTools)).toEqual([false, true, true]);
  });

  it("makes each plan cheaper per credit than the one below", () => {
    expect(DEFAULT_CATALOG.plans.map((p) => formatCreditPrice(planCentsPerCredit(p)))).toEqual(["$0.40", "$0.33", "$0.25"]);
  });

  it("prices every top-up above every plan credit", () => {
    const dearestPlan = Math.max(...DEFAULT_CATALOG.plans.map(planCentsPerCredit));
    for (const pack of DEFAULT_CATALOG.topups) expect(packCentsPerCredit(pack)).toBeGreaterThan(dearestPlan);
    expect(DEFAULT_CATALOG.topups.map((p) => formatCreditPrice(packCentsPerCredit(p)))).toEqual(["$0.60", "$0.50", "$0.45"]);
  });

  it("has a sound ladder", () => {
    expect(ladderIssues(DEFAULT_CATALOG)).toEqual([]);
  });

  it("makes upgrading cheaper than topping up to the same credits", () => {
    const pack = (id: string) => DEFAULT_CATALOG.topups.find((p) => p.id === id)!;
    // Basic + 100 credits reaches Growth's 150 credits for more money.
    expect(plan("BASIC").monthlyCents + pack("topup-100").priceCents).toBeGreaterThan(plan("GROWTH").monthlyCents);
    // Growth + 300 credits passes Teams' 400 credits for more money.
    expect(plan("GROWTH").monthlyCents + pack("topup-300").priceCents).toBeGreaterThan(plan("TEAMS").monthlyCents);
  });
});

describe("periods", () => {
  it("charges ten months for a year", () => {
    expect(planChargeCents(plan("GROWTH"), "monthly")).toBe(5000);
    expect(planChargeCents(plan("GROWTH"), "annual")).toBe(50000);
    expect(annualMonthlyCents(plan("GROWTH"))).toBe(4167);
    expect(annualMonthlyCents(plan("BASIC"))).toBe(1667);
    expect(annualSavingPercent(plan("TEAMS"))).toBe(17);
  });

  it("grants credits monthly across a yearly plan", () => {
    expect(creditsForPeriod(plan("BASIC"), "monthly")).toBe(50);
    expect(creditsForPeriod(plan("BASIC"), "annual")).toBe(600);
  });
});

describe("overrides", () => {
  it("lays valid overrides over the defaults", () => {
    const c = resolveCatalog({ plans: { GROWTH: { credits: 200, monthlyCents: 5900 } }, topups: { "topup-25": { credits: 30 } } });
    const g = findCatalogPlan(c, "GROWTH")!;
    expect([g.monthlyCents, g.annualCents, g.creditsPerMonth]).toEqual([5900, 50000, 200]);
    expect(c.topups[0]).toMatchObject({ credits: 30, priceCents: 1500, label: "Top-up 30" });
    expect(findCatalogPlan(c, "BASIC")!.monthlyCents).toBe(2000);
  });

  it("drops fields outside the bounds and says why", () => {
    const { catalog, errors } = sanitizeCatalogOverrides({ plans: { BASIC: { monthlyCents: 50, credits: 1.5 } }, topups: { "topup-100": { priceCents: "50" } } });
    expect(catalog).toEqual({});
    expect(errors).toEqual([
      "Basic monthly price must be between $1 and $10,000, in whole cents.",
      "Basic credits a month must be a whole number from 1 to 100,000.",
      "Top-up 100 price must be between $1 and $100,000, in whole cents.",
    ]);
  });

  it("refuses a yearly price above twelve months", () => {
    const { catalog, errors } = sanitizeCatalogOverrides({ plans: { TEAMS: { annualCents: 130000 } } });
    expect(catalog).toEqual({});
    expect(errors).toEqual(["The Teams yearly price cannot be more than twelve monthly payments."]);
  });

  it("ignores unknown plans and packs", () => {
    expect(sanitizeCatalogOverrides({ plans: { FREE: { monthlyCents: 0 } }, topups: { "team-50": { credits: 5 } } })).toEqual({ catalog: {}, errors: [] });
  });

  it("reports a broken ladder", () => {
    const c = resolveCatalog({ plans: { GROWTH: { credits: 100 } }, topups: { "topup-25": { priceCents: 500 } } });
    expect(ladderIssues(c)).toEqual([
      "A credit on Growth ($0.50) is not cheaper than on Basic ($0.40).",
      "Top-up 25 ($0.20 a credit) costs no more than Growth plan credits ($0.50), so topping up beats paying for a plan.",
      "Top-up 100 ($0.50 a credit) costs no more than Growth plan credits ($0.50), so topping up beats paying for a plan.",
      "Top-up 300 ($0.45 a credit) costs no more than Growth plan credits ($0.50), so topping up beats paying for a plan.",
      "Top-up 100 costs more per credit than Top-up 25.",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_CATALOG, resolveCatalog } from "./catalog";
import { buildPlansPage } from "./plans-public";

describe("buildPlansPage", () => {
  const page = buildPlansPage(DEFAULT_CATALOG);

  it("lists Basic, Growth, Teams then Enterprise with catalogue prices", () => {
    expect(page.plans.map((p) => [p.key, p.price.monthly, p.price.annual])).toEqual([
      ["BASIC", "$20", "$200"],
      ["GROWTH", "$50", "$500"],
      ["TEAMS", "$100", "$1,000"],
      ["ENTERPRISE", "Custom", "Custom"],
    ]);
    expect(page.plans.find((p) => p.recommended)?.key).toBe("GROWTH");
    expect(page.savingPercent).toBe(17);
  });

  it("says what each plan includes, with Growth tools only from Growth up", () => {
    expect(page.plans[0].includes).toEqual(["50 AI credits every month", "1 workspace, 3 people in each", "AI screening, take homes and live interviews"]);
    expect(page.plans[2].includes).toContain("Greenhouse sync, webhooks, API and MCP");
    expect(page.compare.find((r) => r.feature === "Greenhouse sync")?.cells).toEqual(["No", "Yes", "Yes", "Yes"]);
  });

  it("prices top-ups per credit and follows admin overrides", () => {
    expect(page.topups.map((t) => [t.label, t.price, t.perCredit])).toEqual([
      ["Top-up 25", "$15", "$0.60"],
      ["Top-up 100", "$50", "$0.50"],
      ["Top-up 300", "$135", "$0.45"],
    ]);
    const o = buildPlansPage(resolveCatalog({ plans: { GROWTH: { monthlyCents: 6000, credits: 200 } } }));
    expect(o.plans[1].price.monthly).toBe("$60");
    expect(o.plans[1].includes[0]).toBe("200 AI credits every month");
    expect(o.faq.find((f) => f.q.startsWith("What if"))?.a).toContain("from $0.45 a credit");
  });
});

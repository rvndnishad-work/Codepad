import { describe, expect, it } from "vitest";
import { demoRequestSchema, isEnterpriseLead, slugFromCompany, suggestedPlan } from "./model";

const valid = {
  name: " Priya Raman ",
  email: "Priya@Northwind.io",
  company: "Northwind Labs",
  teamSize: "4-10",
  monthlyVolume: "50-200",
  hiringType: "technical",
};

describe("demoRequestSchema", () => {
  it("trims, lowercases the email and defaults the source", () => {
    const r = demoRequestSchema.parse({ ...valid, jobTitle: "", message: "" });
    expect(r.name).toBe("Priya Raman");
    expect(r.email).toBe("priya@northwind.io");
    expect(r.source).toBe("direct");
    expect(r.jobTitle).toBeUndefined();
    expect(r.message).toBeUndefined();
  });

  it("names each missing field in plain words", () => {
    const r = demoRequestSchema.safeParse({ name: "", email: "nope", company: "" });
    expect(r.success).toBe(false);
    const f = r.success ? {} : r.error.flatten().fieldErrors;
    expect(f.name?.[0]).toBe("Add your name.");
    expect(f.email?.[0]).toBe("Add a valid work email.");
    expect(f.teamSize?.[0]).toBe("Pick your team size.");
    expect(f.monthlyVolume?.[0]).toBe("Pick how many candidates you screen.");
    expect(f.hiringType?.[0]).toBe("Pick what you hire for.");
  });

  it("rejects an unknown source", () => {
    expect(demoRequestSchema.safeParse({ ...valid, source: "evil" }).success).toBe(false);
  });
});

describe("sizing a request", () => {
  it("tags big teams or volumes as Enterprise leads", () => {
    expect(isEnterpriseLead({ teamSize: "26+", monthlyVolume: "under-50" })).toBe(true);
    expect(isEnterpriseLead({ teamSize: "1-3", monthlyVolume: "500+" })).toBe(true);
    expect(isEnterpriseLead({ teamSize: "11-25", monthlyVolume: "200-500" })).toBe(false);
  });

  it("suggests the plan that fits the bigger of team and volume", () => {
    expect(suggestedPlan({ teamSize: "1-3", monthlyVolume: "under-50" })).toBe("Basic");
    expect(suggestedPlan({ teamSize: "4-10", monthlyVolume: "under-50" })).toBe("Growth");
    expect(suggestedPlan({ teamSize: "1-3", monthlyVolume: "200-500" })).toBe("Teams");
    expect(suggestedPlan({ teamSize: "26+", monthlyVolume: "under-50" })).toBe("Enterprise");
  });
});

describe("slugFromCompany", () => {
  it("makes a workspace address from a company name", () => {
    expect(slugFromCompany("Northwind Labs, Inc.")).toBe("northwind-labs-inc");
    expect(slugFromCompany("Café Zürich")).toBe("cafe-zurich");
    expect(slugFromCompany("!!!")).toBe("pilot");
  });
});

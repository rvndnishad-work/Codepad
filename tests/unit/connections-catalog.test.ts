import { describe, expect, it } from "vitest";
import { buildCatalog, countCards, syncedWhen, type CatalogInput } from "@/lib/connections/catalog";
import { parseLegacyPayload, pickMapping } from "@/lib/ats/legacy-webhook";

const now = new Date("2026-09-26T12:00:00Z");
const base: CatalogInput = {
  slug: "acme",
  growth: true,
  canManage: true,
  now,
  ats: null,
  webhooks: { endpoints: 0, failing: 0, paused: 0 },
  apiKeys: 0,
};
const card = (cards: ReturnType<typeof buildCatalog>, key: string) => cards.find((c) => c.key === key)!;

describe("buildCatalog", () => {
  it("offers Greenhouse to admins and plans the rest", () => {
    const cards = buildCatalog(base);
    expect(card(cards, "greenhouse").state).toBe("available");
    expect(card(cards, "greenhouse").action?.href).toBe("/w/acme/connections/ats/setup");
    for (const k of ["ashby", "lever", "google-calendar", "microsoft-365", "slack", "teams"]) {
      expect(card(cards, k).state).toBe("planned");
    }
    expect(countCards(cards)).toEqual({ all: 9, connected: 0, attention: 0 });
  });

  it("does not offer a connect button to non-admins", () => {
    expect(card(buildCatalog({ ...base, canManage: false }), "greenhouse").action).toBeNull();
  });

  it("locks Growth tools on Free", () => {
    const cards = buildCatalog({ ...base, growth: false });
    for (const k of ["greenhouse", "webhooks", "api"]) {
      expect(card(cards, k).state).toBe("locked");
      expect(card(cards, k).action?.href).toBe("/w/acme?section=billing");
    }
  });

  it("shows a connected Greenhouse with its numbers", () => {
    const cards = buildCatalog({
      ...base,
      ats: { provider: "greenhouse", partner: true, setupComplete: true, imported30d: 38, decisionsSent30d: 12, lastSyncAt: "2026-09-26T11:56:00Z", needsAttention: 0 },
      webhooks: { endpoints: 2, failing: 1, paused: 0 },
      apiKeys: 3,
    });
    const gh = card(cards, "greenhouse");
    expect(gh.state).toBe("connected");
    expect(gh.meta).toBe("Last sync 4 min ago. 38 candidates imported in 30 days, 12 decisions sent back.");
    expect(card(cards, "ashby").meta).toBe("One ATS per workspace. Disconnect Greenhouse to switch.");
    expect(card(cards, "webhooks").chip).toBe("1 failing");
    expect(card(cards, "api").chip).toBe("3 keys");
    expect(countCards(cards)).toEqual({ all: 9, connected: 3, attention: 1 });
  });

  it("sends an unfinished setup back to the wizard", () => {
    const gh = card(
      buildCatalog({ ...base, ats: { provider: "greenhouse", partner: true, setupComplete: false, imported30d: 0, decisionsSent30d: 0, lastSyncAt: null, needsAttention: 0 } }),
      "greenhouse",
    );
    expect(gh.state).toBe("attention");
    expect(gh.action?.label).toBe("Finish setup");
  });

  it("words sync times", () => {
    expect(syncedWhen("2026-09-26T11:59:40Z", now)).toBe("just now");
    expect(syncedWhen("2026-09-25T10:00:00Z", now)).toBe("yesterday");
    expect(syncedWhen("2026-07-01T10:00:00Z", now)).toBe("on 1 Jul");
  });
});

describe("legacy webhook payloads", () => {
  it("reads the Greenhouse shape", () => {
    const p = parseLegacyPayload("greenhouse", {
      candidate: { id: 7, first_name: "Liam", last_name: "Chen", email_addresses: [{ value: "Liam@x.com" }] },
      application: { id: 12, jobs: [{ name: "Backend Engineer, Payments" }] },
    });
    expect(p).toEqual({ name: "Liam Chen", email: "liam@x.com", externalId: "7", applicationId: "12", mappingRef: null, jobName: "Backend Engineer, Payments" });
  });

  it("reads Ashby and generic shapes, and refuses a missing email", () => {
    expect(parseLegacyPayload("ashby", { candidate: { name: "Omar", email: "omar@x.com" }, job: { title: "EM" } })?.jobName).toBe("EM");
    expect(parseLegacyPayload("lever", { name: "Jo", email: "jo@x.com", partner_test_id: "m1" })?.mappingRef).toBe("m1");
    expect(parseLegacyPayload("lever", { name: "Jo" })).toBeNull();
  });

  it("picks the mapping by id first, then by job name, never a guess", () => {
    const maps = [
      { id: "m1", jobName: "Senior Frontend Engineer" },
      { id: "m2", jobName: "Backend Engineer, Payments" },
    ];
    const p = parseLegacyPayload("lever", { name: "Jo", email: "jo@x.com", jobName: "backend engineer, payments" })!;
    expect(pickMapping(p, maps)?.id).toBe("m2");
    expect(pickMapping({ ...p, mappingRef: "m1" }, maps)?.id).toBe("m1");
    expect(pickMapping({ ...p, jobName: "Account Executive" }, maps)).toBeNull();
    expect(pickMapping({ ...p, jobName: null }, maps)).toBeNull();
  });
});

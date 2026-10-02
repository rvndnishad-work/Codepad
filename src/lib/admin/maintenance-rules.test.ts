import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  matchRule,
  patternScore,
  isExemptPath,
  isRuleActive,
  isRuleUpcoming,
  isInBannerWindow,
  retryAfterSeconds,
  backInAbout,
  areaDepth,
  AREAS,
  type RuleLike,
} from "./maintenance-rules";

const NOW = new Date("2026-10-04T01:00:00Z");
const mins = (m: number) => new Date(NOW.getTime() + m * 60_000);

function rule(area: string, extra: Partial<RuleLike> = {}): RuleLike {
  return {
    id: area,
    area,
    paths: [],
    message: area,
    startsAt: null,
    endsAt: null,
    bannerHours: 24,
    bypassRoles: [],
    endedAt: null,
    ...extra,
  };
}

describe("patternScore", () => {
  it("matches by whole segment", () => {
    expect(patternScore("/play", "/play")).not.toBeNull();
    expect(patternScore("/play", "/play/abc")).not.toBeNull();
    expect(patternScore("/play", "/playgrounds")).toBeNull();
    expect(patternScore("/interview", "/interview-questions/x")).toBeNull();
  });
  it("supports one-segment wildcards", () => {
    expect(patternScore("/w/*/interviews/*/room", "/w/acme/interviews/123/room")).not.toBeNull();
    expect(patternScore("/w/*/interviews/*/room", "/w/acme/interviews/123/lobby")).toBeNull();
    expect(patternScore("/interview/*", "/interview")).toBeNull();
    expect(patternScore("/interview/*", "/interview/abc/report")).not.toBeNull();
  });
  it("the root matches everything with the lowest score", () => {
    expect(patternScore("/", "/anything/here")).toBe(0);
  });
});

describe("isExemptPath", () => {
  it.each(["/admin", "/admin/maintenance", "/api/admin/x", "/login", "/api/auth/callback/github", "/api/webhooks/stripe", "/api/cron/notifications", "/logo.png", "/robots.txt"])(
    "%s is exempt",
    (p) => expect(isExemptPath(p)).toBe(true),
  );
  it.each(["/", "/play", "/administrator", "/w/acme", "/api/execute"])("%s is not exempt", (p) =>
    expect(isExemptPath(p)).toBe(false),
  );
});

describe("matchRule", () => {
  const site = rule("site");
  const hiring = rule("hiring");
  const room = rule("room");
  const playground = rule("playground");

  it("returns null when nothing covers the path", () => {
    expect(matchRule("/play", [hiring])).toBeNull();
  });
  it("never matches exempt paths, even under a site rule", () => {
    expect(matchRule("/admin", [site])).toBeNull();
    expect(matchRule("/api/cron/x", [site])).toBeNull();
  });
  it("a page rule wins over its area, and an area over the site", () => {
    const rules = [site, hiring, room];
    expect(matchRule("/w/acme/interviews/9/room", rules)?.id).toBe("room");
    expect(matchRule("/w/acme/candidates", rules)?.id).toBe("hiring");
    expect(matchRule("/blog", rules)?.id).toBe("site");
  });
  it("order of rules does not matter", () => {
    expect(matchRule("/w/acme/interviews/9/room", [room, hiring, site])?.id).toBe("room");
    expect(matchRule("/play/x", [playground, site, rule("dev")])?.id).toBe("playground");
    expect(matchRule("/play/x", [rule("dev"), site, playground])?.id).toBe("playground");
  });
  it("a custom rule with its own paths wins at equal length", () => {
    const custom = rule("custom", { id: "c", paths: ["/play"] });
    expect(matchRule("/play", [playground, custom])?.id).toBe("c");
  });
  it("uses the area registry when a rule has no paths", () => {
    expect(matchRule("/creators/x", [rule("creators")])?.id).toBe("creators");
    expect(matchRule("/api/mcp", [rule("public-api")])?.id).toBe("public-api");
  });
});

describe("area tree", () => {
  it("child areas are deeper than their parents and inside their paths", () => {
    for (const a of AREAS) {
      if (!a.parent) continue;
      expect(areaDepth(a.key)).toBeGreaterThan(areaDepth(a.parent));
      const parent = AREAS.find((p) => p.key === a.parent)!;
      for (const path of a.paths) {
        const concrete = path.replace(/\*/g, "x");
        expect(parent.paths.some((pp) => patternScore(pp, concrete) !== null)).toBe(true);
      }
    }
  });
});

describe("time window", () => {
  it("open-ended rule is active", () => {
    expect(isRuleActive(rule("site"), NOW)).toBe(true);
  });
  it("respects startsAt and endsAt", () => {
    expect(isRuleActive(rule("site", { startsAt: mins(10) }), NOW)).toBe(false);
    expect(isRuleActive(rule("site", { startsAt: mins(-10), endsAt: mins(10) }), NOW)).toBe(true);
    expect(isRuleActive(rule("site", { startsAt: mins(-10), endsAt: NOW }), NOW)).toBe(false);
    expect(isRuleActive(rule("site", { startsAt: NOW }), NOW)).toBe(true);
  });
  it("an ended rule is never active or upcoming", () => {
    const r = rule("site", { endedAt: mins(-1), startsAt: mins(60) });
    expect(isRuleActive(r, NOW)).toBe(false);
    expect(isRuleUpcoming(r, NOW)).toBe(false);
  });
  it("upcoming and banner lead", () => {
    const r = rule("room", { startsAt: mins(120), endsAt: mins(180), bannerHours: 1 });
    expect(isRuleUpcoming(r, NOW)).toBe(true);
    expect(isInBannerWindow(r, NOW)).toBe(false);
    expect(isInBannerWindow(r, mins(61))).toBe(true);
    expect(isInBannerWindow({ ...r, bannerHours: 0 }, mins(119))).toBe(false);
    expect(isInBannerWindow({ ...r, bannerHours: 24 }, NOW)).toBe(true);
  });
  it("Retry-After and the back-in text follow endsAt", () => {
    expect(retryAfterSeconds(null, NOW)).toBe(3600);
    expect(retryAfterSeconds(mins(40), NOW)).toBe(2400);
    expect(retryAfterSeconds(mins(-5), NOW)).toBe(60);
    expect(backInAbout(mins(40), NOW)).toBe("about 40 minutes");
    expect(backInAbout(mins(1), NOW)).toBe("about 1 minute");
    expect(backInAbout(mins(180), NOW)).toBe("about 3 hours");
    expect(backInAbout(null, NOW)).toBeNull();
  });
});

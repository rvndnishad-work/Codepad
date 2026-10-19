import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { domainConfig, recruiterUrl, routeForHost, siteForPath, siteForRequestHost, type DomainConfig } from "./domains";

const cfg: DomainConfig = {
  developerOrigin: "https://dev.example",
  recruiterOrigin: "https://hire.example",
  legacyHosts: ["interviewpad.in"],
  permanent: false,
};

describe("siteForPath", () => {
  it("sorts pages by site, with shared pages left alone", () => {
    expect(siteForPath("/")).toBe("developer");
    expect(siteForPath("/challenges/two-sum")).toBe("developer");
    expect(siteForPath("/c/alice")).toBe("developer");
    expect(siteForPath("/hire")).toBe("recruiter");
    expect(siteForPath("/w/acme/candidates")).toBe("recruiter");
    expect(siteForPath("/take-home/abc")).toBe("recruiter");
    expect(siteForPath("/login")).toBeNull();
    expect(siteForPath("/interview/123")).toBeNull();
    expect(siteForPath("/api/auth/callback/github")).toBeNull();
    // Prefix match is by path segment, not by letters.
    expect(siteForPath("/wiki")).toBeNull();
    expect(siteForPath("/creators")).toBe("developer");
  });
});

describe("routeForHost", () => {
  it("does nothing until both domains are configured", () => {
    expect(routeForHost("dev.example", "/w/acme", "", null)).toBeNull();
  });

  it("leaves unknown hosts alone (previews, localhost)", () => {
    expect(routeForHost("codepad-git-x.vercel.app", "/w/acme", "", cfg)).toBeNull();
    expect(routeForHost("localhost:3000", "/hire", "", cfg)).toBeNull();
  });

  it("moves recruiter pages off the developer domain, keeping the query", () => {
    expect(routeForHost("dev.example", "/w/acme", "?tab=1", cfg)).toEqual({ kind: "redirect", url: "https://hire.example/w/acme?tab=1", status: 307 });
    expect(routeForHost("www.dev.example", "/hire", "", cfg)).toEqual({ kind: "redirect", url: "https://hire.example/", status: 307 });
    expect(routeForHost("dev.example", "/challenges", "", cfg)).toBeNull();
    expect(routeForHost("dev.example", "/", "", cfg)).toBeNull();
    expect(routeForHost("dev.example", "/login", "?next=%2Fw", cfg)).toBeNull();
  });

  it("serves the recruiter home at / on the recruiter domain", () => {
    expect(routeForHost("hire.example", "/", "", cfg)).toEqual({ kind: "rewrite", pathname: "/hire" });
    expect(routeForHost("hire.example", "/hire", "?ref=x", cfg)).toEqual({ kind: "redirect", url: "https://hire.example/?ref=x", status: 307 });
    expect(routeForHost("hire.example", "/sitemap.xml", "", cfg)).toEqual({ kind: "rewrite", pathname: "/sitemap-recruiter.xml" });
    expect(routeForHost("hire.example", "/robots.txt", "", cfg)).toEqual({ kind: "rewrite", pathname: "/robots-recruiter.txt" });
    expect(routeForHost("hire.example", "/w/acme", "", cfg)).toBeNull();
    expect(routeForHost("hire.example", "/interview/1", "?token=t", cfg)).toBeNull();
  });

  it("moves developer pages off the recruiter domain", () => {
    expect(routeForHost("hire.example", "/playgrounds", "", cfg)).toEqual({ kind: "redirect", url: "https://dev.example/playgrounds", status: 307 });
  });

  it("sends old-domain visitors to the right new domain but keeps /api there", () => {
    expect(routeForHost("interviewpad.in", "/take-home/tok", "", cfg)).toEqual({ kind: "redirect", url: "https://hire.example/take-home/tok", status: 307 });
    expect(routeForHost("www.interviewpad.in", "/hire", "", cfg)).toEqual({ kind: "redirect", url: "https://hire.example/", status: 307 });
    expect(routeForHost("interviewpad.in", "/interview/1", "?token=t", cfg)).toEqual({ kind: "redirect", url: "https://dev.example/interview/1?token=t", status: 307 });
    expect(routeForHost("interviewpad.in", "/", "", cfg)).toEqual({ kind: "redirect", url: "https://dev.example/", status: 307 });
    expect(routeForHost("interviewpad.in", "/api/webhooks/stripe", "", cfg)).toBeNull();
  });

  it("uses 308 once redirects are made permanent", () => {
    expect(routeForHost("dev.example", "/w", "", { ...cfg, permanent: true })).toMatchObject({ status: 308 });
  });
});

describe("domainConfig", () => {
  const KEYS = ["NEXTAUTH_URL", "AUTH_URL", "NEXT_PUBLIC_SITE_URL", "APP_URL", "RECRUITER_SITE_URL", "LEGACY_SITE_HOSTS", "DOMAIN_REDIRECTS_PERMANENT", "VERCEL", "VERCEL_ENV"];
  beforeEach(() => {
    for (const k of KEYS) vi.stubEnv(k, "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is off without a separate recruiter domain", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dev.example");
    expect(domainConfig()).toBeNull();
    vi.stubEnv("RECRUITER_SITE_URL", "https://www.dev.example");
    expect(domainConfig()).toBeNull();
    expect(recruiterUrl("/hire")).toBe("https://dev.example/hire");
  });

  it("reads both domains, legacy hosts and the permanent switch", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dev.example");
    vi.stubEnv("RECRUITER_SITE_URL", "https://hire.example/");
    vi.stubEnv("LEGACY_SITE_HOSTS", "interviewpad.in, https://www.old.example/");
    vi.stubEnv("DOMAIN_REDIRECTS_PERMANENT", "true");
    expect(domainConfig()).toEqual({
      developerOrigin: "https://dev.example",
      recruiterOrigin: "https://hire.example",
      legacyHosts: ["interviewpad.in", "old.example"],
      permanent: true,
    });
    expect(recruiterUrl("/hire")).toBe("https://hire.example/");
    expect(recruiterUrl("/pricing")).toBe("https://hire.example/pricing");
  });

  it("tells pages which site a request is on, and null when not split", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dev.example");
    expect(siteForRequestHost("dev.example")).toBeNull();
    vi.stubEnv("RECRUITER_SITE_URL", "https://hire.example");
    vi.stubEnv("LEGACY_SITE_HOSTS", "old.example");
    expect(siteForRequestHost("www.dev.example")).toBe("developer");
    expect(siteForRequestHost("hire.example")).toBe("recruiter");
    expect(siteForRequestHost("old.example")).toBeNull();
    expect(siteForRequestHost("codepad-git-x.vercel.app")).toBeNull();
  });
});

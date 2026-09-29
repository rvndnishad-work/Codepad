import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanOrigin, configuredOrigin, originFromHeaders, siteOrigin } from "./site-url";

const KEYS = ["NEXTAUTH_URL", "AUTH_URL", "NEXT_PUBLIC_SITE_URL", "APP_URL", "VERCEL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL", "NODE_ENV"];
const hdrs = (m: Record<string, string>) => ({ get: (k: string) => m[k] ?? null });

describe("site-url", () => {
  beforeEach(() => {
    for (const k of KEYS) vi.stubEnv(k, "");
    vi.stubEnv("NODE_ENV", "development");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uses localhost only in local development", () => {
    expect(siteOrigin()).toBe("http://localhost:3000");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000/");
    expect(siteOrigin()).toBe("http://localhost:3000");
  });

  it("never returns localhost on a Vercel production deployment", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(configuredOrigin()).toBeNull();
    expect(siteOrigin()).toBe("https://interviewpad.in");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "codepad-abc.vercel.app");
    expect(siteOrigin()).toBe("https://interviewpad.in");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "www.interviewpad.in");
    expect(siteOrigin()).toBe("https://www.interviewpad.in");
  });

  it("prefers an explicit env var and trims paths and slashes", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://interviewpad.in/");
    expect(siteOrigin()).toBe("https://interviewpad.in");
    expect(cleanOrigin("interviewpad.in/path")).toBe("https://interviewpad.in");
    expect(cleanOrigin("not a url")).toBeNull();
  });

  it("uses the preview URL on preview deployments", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "codepad-git-x.vercel.app");
    expect(siteOrigin()).toBe("https://codepad-git-x.vercel.app");
  });

  it("reads the request host, skipping localhost and raw vercel.app hosts on production", () => {
    expect(originFromHeaders(hdrs({ host: "localhost:3000" }))).toBe("http://localhost:3000");
    expect(originFromHeaders(hdrs({ "x-forwarded-host": "interviewpad.in", "x-forwarded-proto": "https" }))).toBe("https://interviewpad.in");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(originFromHeaders(hdrs({ host: "localhost:3000" }))).toBeNull();
    expect(originFromHeaders(hdrs({ host: "codepad-abc.vercel.app" }))).toBeNull();
    expect(originFromHeaders(hdrs({}))).toBeNull();
  });
});

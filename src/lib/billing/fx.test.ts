// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { getUsdInrRate, resetUsdInrRateCache } from "./fx";

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

beforeEach(() => {
  resetUsdInrRateCache();
  delete process.env.RAZORPAY_USD_INR_RATE;
});
afterEach(() => vi.unstubAllGlobals());

describe("getUsdInrRate", () => {
  it("uses the first live source and caches it for a day", async () => {
    const f = vi.fn(async () => json({ result: "success", rates: { INR: 84.2 } }));
    vi.stubGlobal("fetch", f);
    const t = Date.UTC(2026, 9, 22);
    expect(await getUsdInrRate(t)).toMatchObject({ rate: 84.2, source: "live" });
    expect(await getUsdInrRate(t + 23 * 3600_000)).toMatchObject({ rate: 84.2 });
    expect(f).toHaveBeenCalledTimes(1);
    await getUsdInrRate(t + 25 * 3600_000);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("falls through to the second source when the first fails or is absurd", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({ rates: { INR: 0.012 } }))
      .mockResolvedValueOnce(json({ rates: { INR: 85.5 } }));
    vi.stubGlobal("fetch", f);
    expect(await getUsdInrRate()).toMatchObject({ rate: 85.5, source: "live" });
  });

  it("uses RAZORPAY_USD_INR_RATE when no live source answers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    process.env.RAZORPAY_USD_INR_RATE = "86";
    expect(await getUsdInrRate()).toMatchObject({ rate: 86, source: "fallback" });
  });

  it("returns null with no live rate and no fallback", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({}, false)));
    expect(await getUsdInrRate()).toBeNull();
  });
});

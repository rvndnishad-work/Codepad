/**
 * USD to INR exchange rate for Razorpay checkout. Credit packs are priced in
 * US cents; Razorpay offers UPI, netbanking and wallets only on rupee orders,
 * so checkout converts the dollar price at the day's rate.
 *
 * The rate is fetched at most once a day per server instance, from
 * open.er-api.com, then api.frankfurter.app. If both fail, RAZORPAY_USD_INR_RATE
 * is used. With no rate at all, checkout refuses rather than guess.
 */
import "server-only";
import { RATE_BOUNDS } from "./fx-math";

const DAY_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 10 * 60 * 1000;

export type UsdInrRate = { rate: number; source: "live" | "fallback"; at: string };

type Source = { url: string; pick: (j: unknown) => unknown };
const SOURCES: Source[] = [
  { url: "https://open.er-api.com/v6/latest/USD", pick: (j) => (j as { rates?: { INR?: unknown } })?.rates?.INR },
  { url: "https://api.frankfurter.app/latest?from=USD&to=INR", pick: (j) => (j as { rates?: { INR?: unknown } })?.rates?.INR },
];

let cached: { value: UsdInrRate; until: number } | null = null;

const sane = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= RATE_BOUNDS.min && n <= RATE_BOUNDS.max;

async function fetchLive(): Promise<number | null> {
  for (const s of SOURCES) {
    try {
      const res = await fetch(s.url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const rate = s.pick(await res.json());
      if (sane(rate)) return rate;
    } catch {
      // Try the next source.
    }
  }
  return null;
}

function fallbackRate(): number | null {
  const n = Number(process.env.RAZORPAY_USD_INR_RATE);
  return sane(n) ? n : null;
}

/** Today's USD to INR rate, or null when no live or fallback rate exists. */
export async function getUsdInrRate(now = Date.now()): Promise<UsdInrRate | null> {
  if (cached && cached.until > now) return cached.value;
  const live = await fetchLive();
  if (live !== null) {
    cached = { value: { rate: live, source: "live", at: new Date(now).toISOString() }, until: now + DAY_MS };
    return cached.value;
  }
  console.warn("[billing] Could not fetch a live USD to INR rate; using RAZORPAY_USD_INR_RATE.");
  const fb = fallbackRate();
  if (fb === null) return null;
  // Try live again soon rather than holding the fallback all day.
  cached = { value: { rate: fb, source: "fallback", at: new Date(now).toISOString() }, until: now + RETRY_MS };
  return cached.value;
}

/** Test hook. */
export function resetUsdInrRateCache() {
  cached = null;
}

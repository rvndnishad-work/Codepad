import Stripe from "stripe";

/**
 * Lazy-initialized Stripe client.
 *
 * Why not a module-level `new Stripe(...)`? Previously this file did:
 *
 *   export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {...});
 *
 * which throws synchronously when STRIPE_SECRET_KEY is missing — and that crash
 * runs at *module import time*, not at use time. Any file that imported this
 * (even transitively, via a server-actions file) would fail to load in
 * environments without the key — most notably local dev. That trap forced
 * call sites to use `await import("@/lib/stripe")` as a workaround.
 *
 * With getStripe(), the SDK initialization is deferred to first call. Callers
 * can import the module freely; the throw (and clear error) only happens if
 * code actually tries to use Stripe without the env var set.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to your environment or skip Stripe-dependent flows."
    );
  }
  cached = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });
  return cached;
}

import "server-only";
import Razorpay from "razorpay";
export { verifyRazorpaySignature } from "./razorpay-signature";

/**
 * Lazy Razorpay client, same idea as getStripe(): importing this module never
 * throws, only using the client without keys does. Keys come from the
 * environment only (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET). The secret never
 * leaves the server; the key id is public and is handed to the browser by the
 * create-order route so the checkout modal can open.
 */
let cached: Razorpay | null = null;

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** The public key id for the checkout modal. */
export function razorpayKeyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
}

export function getRazorpay(): Razorpay {
  if (cached) return cached;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must both be set to take payments with Razorpay.");
  }
  cached = new Razorpay({ key_id, key_secret });
  return cached;
}

/** HTTP status of a Razorpay API error, when the SDK reports one. */
export function razorpayErrorStatus(err: unknown): number | null {
  if (typeof err === "object" && err !== null && "statusCode" in err) {
    const s = (err as { statusCode: unknown }).statusCode;
    return typeof s === "number" ? s : null;
  }
  return null;
}

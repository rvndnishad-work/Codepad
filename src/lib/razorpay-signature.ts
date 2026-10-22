import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay Standard Checkout signature check. Razorpay signs
 * `order_id + "|" + payment_id` with HMAC-SHA256 using the key secret and
 * sends the hex digest as razorpay_signature. Compared in constant time.
 */
export function razorpaySignature(orderId: string, paymentId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

export function verifyRazorpaySignature(a: { orderId: string; paymentId: string; signature: string; secret: string }): boolean {
  if (!a.orderId || !a.paymentId || !a.signature || !a.secret) return false;
  const expected = Buffer.from(razorpaySignature(a.orderId, a.paymentId, a.secret), "utf8");
  const given = Buffer.from(a.signature, "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

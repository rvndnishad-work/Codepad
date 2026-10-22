/**
 * Admin test payments: charge any amount through the same Razorpay keys and
 * modal the credit checkout uses, without touching any workspace or credits.
 * For checking the account setup (currency, payment methods, capture) on a
 * deployed server. Callers check platform:admin first.
 */
import "server-only";
import { getRazorpay, verifyRazorpaySignature } from "@/lib/razorpay";
import { RazorpayCheckoutError, RAZORPAY_MIN_AMOUNT } from "./razorpay-credit-checkout";

export const TEST_CURRENCIES = ["INR", "USD"] as const;
export type TestCurrency = (typeof TEST_CURRENCIES)[number];
/** 50,000.00 in either currency. A test should never need more. */
export const TEST_MAX_MINOR = 5_000_000;
const KIND = "ADMIN_TEST";

export function parseTestAmount(amount: unknown, currency: unknown): { minor: number; currency: TestCurrency } {
  if (typeof currency !== "string" || !TEST_CURRENCIES.includes(currency as TestCurrency)) {
    throw new RazorpayCheckoutError("Currency must be INR or USD.");
  }
  const major = typeof amount === "number" ? amount : typeof amount === "string" ? Number(amount.trim()) : NaN;
  if (!Number.isFinite(major)) throw new RazorpayCheckoutError("Enter an amount, for example 1 or 29.50.");
  const minor = Math.round(major * 100);
  if (Math.abs(major * 100 - minor) > 1e-6) throw new RazorpayCheckoutError("Use at most two decimal places.");
  if (minor < RAZORPAY_MIN_AMOUNT) throw new RazorpayCheckoutError("The smallest amount Razorpay takes is 1.00.");
  if (minor > TEST_MAX_MINOR) throw new RazorpayCheckoutError("Test payments are capped at 50,000.00.");
  return { minor, currency: currency as TestCurrency };
}

export async function createTestOrder(a: { amount: unknown; currency: unknown; adminEmail: string | null; keyId: string }) {
  const { minor, currency } = parseTestAmount(a.amount, a.currency);
  const order = await getRazorpay().orders.create({
    amount: minor,
    currency,
    receipt: `admintest_${Date.now().toString(36)}`,
    notes: { kind: KIND, admin: a.adminEmail ?? "unknown" },
  });
  if (order.currency !== currency || Number(order.amount) !== minor) {
    throw new RazorpayCheckoutError(`Razorpay created ${order.amount} ${order.currency} instead of ${minor} ${currency}.`, 502);
  }
  return {
    order_id: order.id,
    amount: minor,
    currency,
    key_id: a.keyId,
    description: "Admin test payment, no credits",
  };
}

export async function verifyTestPayment(a: { orderId: string; paymentId: string; signature: string }) {
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!verifyRazorpaySignature({ orderId: a.orderId, paymentId: a.paymentId, signature: a.signature, secret })) {
    throw new RazorpayCheckoutError("The payment signature did not match.");
  }
  const rzp = getRazorpay();
  const order = await rzp.orders.fetch(a.orderId);
  if ((order.notes as Record<string, unknown> | undefined)?.kind !== KIND) {
    throw new RazorpayCheckoutError("This is not an admin test order.");
  }
  let payment = await rzp.payments.fetch(a.paymentId);
  if (payment.order_id !== a.orderId) throw new RazorpayCheckoutError("The payment does not belong to this order.");
  if (payment.status === "authorized") {
    payment = await rzp.payments.capture(a.paymentId, Number(payment.amount), payment.currency);
  }
  return {
    ok: true,
    payment_id: payment.id,
    order_id: a.orderId,
    status: payment.status,
    method: payment.method ?? null,
    amount: Number(payment.amount),
    currency: payment.currency,
    order_amount: Number(order.amount),
    order_currency: order.currency,
    test_mode: (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_test_"),
  };
}

/**
 * POST /api/admin/razorpay-test/verify
 *   { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Admin-only: check the signature of a test payment and report what Razorpay
 * recorded (status, method, amount, currency). Adds no credits.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { razorpayErrorStatus } from "@/lib/razorpay";
import { RazorpayCheckoutError } from "@/lib/billing/razorpay-credit-checkout";
import { verifyTestPayment } from "@/lib/billing/razorpay-test-payment";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const orderId = str(body.razorpay_order_id);
  const paymentId = str(body.razorpay_payment_id);
  const signature = str(body.razorpay_signature);
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "razorpay_order_id, razorpay_payment_id and razorpay_signature are all required." }, { status: 400 });
  }
  try {
    return NextResponse.json(await verifyTestPayment({ orderId, paymentId, signature }));
  } catch (err) {
    if (err instanceof RazorpayCheckoutError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (razorpayErrorStatus(err) === 400) return NextResponse.json({ error: "Razorpay does not know this order or payment." }, { status: 400 });
    console.error("[admin] Razorpay test verify failed:", err);
    return NextResponse.json({ error: "Could not check the payment with Razorpay." }, { status: 500 });
  }
}

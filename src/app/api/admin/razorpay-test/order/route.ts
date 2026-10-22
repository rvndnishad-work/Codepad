/**
 * POST /api/admin/razorpay-test/order  { amount, currency: "INR" | "USD" }
 * Admin-only: create a Razorpay order for any amount, for testing the account.
 * No workspace, no credits.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { razorpayConfigured, razorpayErrorStatus, razorpayKeyId } from "@/lib/razorpay";
import { RazorpayCheckoutError } from "@/lib/billing/razorpay-credit-checkout";
import { createTestOrder } from "@/lib/billing/razorpay-test-payment";

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!razorpayConfigured()) return NextResponse.json({ error: "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not set on this server." }, { status: 503 });
  try {
    const body = (await req.json().catch(() => ({}))) as { amount?: unknown; currency?: unknown };
    const order = await createTestOrder({ amount: body.amount, currency: body.currency, adminEmail: session?.user?.email ?? null, keyId: razorpayKeyId() });
    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof RazorpayCheckoutError) return NextResponse.json({ error: err.message }, { status: err.status });
    const status = razorpayErrorStatus(err);
    const detail = (err as { error?: { description?: string } })?.error?.description;
    console.error("[admin] Razorpay test order failed:", err);
    return NextResponse.json(
      { error: detail ? `Razorpay said: ${detail}` : "Razorpay did not create the order." },
      { status: status === 401 ? 401 : status === 400 ? 400 : 500 },
    );
  }
}

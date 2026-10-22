/**
 * POST /api/w/[slug]/billing/razorpay/verify-payment
 *   { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Step 3 of Razorpay Standard Checkout: check
 * HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET) against the
 * signature, then add the pack's credits. A mismatch answers 400 and credits
 * nothing. Safe to call twice for the same payment.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { razorpayConfigured, razorpayErrorStatus } from "@/lib/razorpay";
import { fulfillRazorpayCreditPayment, RazorpayCheckoutError } from "@/lib/billing/razorpay-credit-checkout";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const orderId = str(body.razorpay_order_id);
    const paymentId = str(body.razorpay_payment_id);
    const signature = str(body.razorpay_signature);
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "razorpay_order_id, razorpay_payment_id and razorpay_signature are all required." }, { status: 400 });
    }

    const session = await auth().catch(() => null);
    if (!session?.user?.id) return NextResponse.json({ error: "You are signed out. Sign in and try again." }, { status: 401 });
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true, members: { where: { userId: session.user.id }, select: { role: true, permissions: true } } },
    });
    if (!workspace) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    const me = workspace.members[0];
    if (!me || !(await canMember(me, "billing:manage"))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!razorpayConfigured()) return NextResponse.json({ error: "Online payments are not set up on this server yet." }, { status: 503 });

    const res = await fulfillRazorpayCreditPayment({ workspaceId: workspace.id, orderId, paymentId, signature });
    return NextResponse.json({ ok: true, credits: res.credits, alreadyRecorded: !res.recorded });
  } catch (err) {
    if (err instanceof RazorpayCheckoutError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (razorpayErrorStatus(err) === 400) return NextResponse.json({ error: "Razorpay does not know this order or payment." }, { status: 400 });
    console.error("[billing] Razorpay verify failed:", err);
    return NextResponse.json({ error: "Could not confirm the payment. Try again, or if you were charged, contact support with your Razorpay payment id." }, { status: 500 });
  }
}

/**
 * POST /api/w/[slug]/billing/razorpay/seats/verify
 *   { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Prepaid Growth: verify the payment and move the workspace's paid-until date
 * forward. A mismatch answers 400 and changes nothing. Safe to call twice.
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { razorpayConfigured, razorpayErrorStatus } from "@/lib/razorpay";
import { RazorpayCheckoutError } from "@/lib/billing/razorpay-credit-checkout";
import { fulfillRazorpaySeatPayment } from "@/lib/billing/razorpay-seat-checkout";

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

    const res = await fulfillRazorpaySeatPayment({ workspaceId: workspace.id, orderId, paymentId, signature });
    revalidatePath(`/w/${slug}`, "layout");
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    if (err instanceof RazorpayCheckoutError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (razorpayErrorStatus(err) === 400) return NextResponse.json({ error: "Razorpay does not know this order or payment." }, { status: 400 });
    console.error("[billing] Razorpay seat verify failed:", err);
    return NextResponse.json({ error: "Could not confirm the payment. Try again, or if you were charged, contact support with your Razorpay payment id." }, { status: 500 });
  }
}

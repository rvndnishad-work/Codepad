/**
 * Browser side of Razorpay Standard Checkout: load checkout.js once, ask the
 * server for an order, open the modal, and send the result to the verify
 * route. Resolves with what happened; never throws.
 */

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

type SuccessResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type FailedResponse = { error?: { description?: string; reason?: string } };
type RazorpayInstance = { open(): void; on(event: "payment.failed", cb: (r: FailedResponse) => void): void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

let loading: Promise<RazorpayCtor> | null = null;

function loadCheckout(): Promise<RazorpayCtor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loading) return loading;
  loading = new Promise<RazorpayCtor>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CHECKOUT_SRC;
    s.async = true;
    s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay did not load.")));
    s.onerror = () => reject(new Error("Could not load Razorpay checkout. Check your connection or ad blocker and try again."));
    document.body.appendChild(s);
  }).catch((err) => {
    loading = null;
    throw err;
  });
  return loading;
}

export type RazorpayCheckoutResult =
  | { status: "paid"; credits: number }
  | { status: "cancelled" }
  | { status: "error"; message: string };

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: res.ok, status: res.status, data };
}

const errorOf = (data: Record<string, unknown> | null, fallback: string) =>
  typeof data?.error === "string" ? data.error : fallback;

export async function payForCreditPack(a: {
  slug: string;
  packId: string;
  /** Fires once the modal is open, so the caller can clear its busy state. */
  onOpen?: () => void;
  /** Fires on a failed attempt; the modal stays open so the buyer can retry. */
  onAttemptFailed?: (message: string) => void;
}): Promise<RazorpayCheckoutResult> {
  const base = `/api/w/${encodeURIComponent(a.slug)}/billing/razorpay`;
  try {
    const [Razorpay, order] = await Promise.all([loadCheckout(), postJson(`${base}/create-order`, { packId: a.packId })]);
    if (!order.ok || !order.data?.order_id) return { status: "error", message: errorOf(order.data, "Could not start the payment. Try again in a moment.") };
    const o = order.data as { order_id: string; amount: number; currency: string; key_id: string; description: string };
    const keyId = o.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    if (!keyId) return { status: "error", message: "Online payments are not set up on this server yet." };

    return await new Promise<RazorpayCheckoutResult>((resolve) => {
      let settled = false;
      const done = (r: RazorpayCheckoutResult) => {
        if (!settled) {
          settled = true;
          resolve(r);
        }
      };
      const rzp = new Razorpay({
        key: keyId,
        amount: o.amount,
        currency: o.currency,
        order_id: o.order_id,
        name: "Intervutree",
        description: o.description,
        handler: async (resp: SuccessResponse) => {
          // Retry once on a server or network hiccup; the route is idempotent.
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const v = await postJson(`${base}/verify-payment`, resp);
              if (v.ok) return done({ status: "paid", credits: Number(v.data?.credits) || 0 });
              if (v.status < 500) return done({ status: "error", message: errorOf(v.data, "The payment could not be confirmed.") });
              if (attempt === 1) return done({ status: "error", message: errorOf(v.data, "The payment could not be confirmed.") });
            } catch {
              if (attempt === 1) {
                return done({ status: "error", message: `Could not confirm the payment. If you were charged, contact support with payment id ${resp.razorpay_payment_id}.` });
              }
            }
          }
        },
        modal: { ondismiss: () => done({ status: "cancelled" }) },
      });
      rzp.on("payment.failed", (r) => {
        a.onAttemptFailed?.(r.error?.description || "The payment failed. Try again or use another method.");
      });
      rzp.open();
      a.onOpen?.();
    });
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Could not start the payment." };
  }
}

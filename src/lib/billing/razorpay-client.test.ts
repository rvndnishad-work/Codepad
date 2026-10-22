import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { payForCreditPack } from "./razorpay-client";

type Opts = { handler: (r: unknown) => Promise<void>; modal: { ondismiss: () => void }; order_id: string; key: string };
let last: { opts: Opts; failed?: (r: unknown) => void } | null = null;

beforeEach(() => {
  last = null;
  window.Razorpay = vi.fn(function (opts: Opts) {
    const inst = {
      open: vi.fn(),
      on: (_e: string, cb: (r: unknown) => void) => {
        if (last) last.failed = cb;
      },
    };
    last = { opts };
    return inst;
  }) as unknown as NonNullable<typeof window.Razorpay>;
});
afterEach(() => vi.unstubAllGlobals());

function stubFetch(verify: { status: number; body: unknown }) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith("/create-order")) {
        return new Response(JSON.stringify({ order_id: "order_A", amount: 4900, currency: "USD", key_id: "rzp_test_x", description: "d" }), { status: 200 });
      }
      return new Response(JSON.stringify(verify.body), { status: verify.status });
    }),
  );
  return calls;
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const success = { razorpay_payment_id: "pay_A", razorpay_order_id: "order_A", razorpay_signature: "s" };

describe("payForCreditPack", () => {
  it("opens the modal with the server order and reports paid after verify", async () => {
    const calls = stubFetch({ status: 200, body: { ok: true, credits: 50 } });
    const p = payForCreditPack({ slug: "acme", packId: "p" });
    await flush();
    expect(last?.opts.order_id).toBe("order_A");
    expect(last?.opts.key).toBe("rzp_test_x");
    await last!.opts.handler(success);
    await expect(p).resolves.toEqual({ status: "paid", credits: 50 });
    expect(calls).toEqual(["/api/w/acme/billing/razorpay/create-order", "/api/w/acme/billing/razorpay/verify-payment"]);
  });

  it("reports cancelled when the modal is dismissed", async () => {
    stubFetch({ status: 200, body: {} });
    const p = payForCreditPack({ slug: "acme", packId: "p" });
    await flush();
    last!.opts.modal.ondismiss();
    await expect(p).resolves.toEqual({ status: "cancelled" });
  });

  it("passes payment.failed to the caller and keeps waiting", async () => {
    stubFetch({ status: 200, body: {} });
    const onAttemptFailed = vi.fn();
    const p = payForCreditPack({ slug: "acme", packId: "p", onAttemptFailed });
    await flush();
    last!.failed!({ error: { description: "Card declined" } });
    expect(onAttemptFailed).toHaveBeenCalledWith("Card declined");
    last!.opts.modal.ondismiss();
    await expect(p).resolves.toEqual({ status: "cancelled" });
  });

  it("shows the server error when the signature is rejected", async () => {
    stubFetch({ status: 400, body: { error: "The payment signature did not match. Nothing was credited." } });
    const p = payForCreditPack({ slug: "acme", packId: "p" });
    await flush();
    await last!.opts.handler(success);
    await expect(p).resolves.toEqual({ status: "error", message: "The payment signature did not match. Nothing was credited." });
  });
});

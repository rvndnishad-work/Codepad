// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rzp = {
  orders: { create: vi.fn(), fetch: vi.fn() },
  payments: { fetch: vi.fn(), capture: vi.fn() },
};
vi.mock("razorpay", () => ({ default: vi.fn(function () { return rzp; }) }));

const recordPurchase = vi.fn();
vi.mock("@/lib/ai-interview/credits", () => ({ recordPurchase: (...a: unknown[]) => recordPurchase(...a) }));
const checkLowCredits = vi.fn();
vi.mock("./credit-alerts", () => ({ checkLowCredits: (...a: unknown[]) => checkLowCredits(...a) }));
const audit = vi.fn();
vi.mock("@/lib/workspace-audit", () => ({
  writeWorkspaceAuditEntry: (...a: unknown[]) => audit(...a),
  WORKSPACE_AUDIT_ACTIONS: { CREDITS_PURCHASED: "CREDITS_PURCHASED" },
}));
vi.mock("./pricing-copy-store", async () => {
  const { DEFAULT_PRICES } = await import("./prices");
  return { getEffectivePricing: async () => DEFAULT_PRICES };
});

import { razorpaySignature } from "@/lib/razorpay-signature";
import { DEFAULT_PRICES } from "./prices";
import { createRazorpayCreditOrder, fulfillRazorpayCreditPayment } from "./razorpay-credit-checkout";

const SECRET = "unit_test_secret";
const pack = DEFAULT_PRICES.packs[0];
const ws = { id: "ws_123456789012345", name: "Acme", slug: "acme" };
const order = {
  id: "order_A",
  amount: pack.priceCents,
  currency: "USD",
  notes: { kind: "AI_CREDIT_PACK", workspaceId: ws.id, packId: pack.id, credits: String(pack.credits) },
};
const sig = razorpaySignature("order_A", "pay_A", SECRET);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = "rzp_test_x";
  process.env.RAZORPAY_KEY_SECRET = SECRET;
  rzp.orders.fetch.mockResolvedValue(order);
  rzp.payments.fetch.mockResolvedValue({ id: "pay_A", order_id: "order_A", amount: pack.priceCents, currency: "USD", status: "captured" });
  recordPurchase.mockResolvedValue({ recorded: true });
});

describe("createRazorpayCreditOrder", () => {
  it("creates a USD order for the pack price with the pack in the notes", async () => {
    rzp.orders.create.mockResolvedValue({ id: "order_A", amount: pack.priceCents, currency: "USD" });
    const res = await createRazorpayCreditOrder({ workspace: ws, packId: pack.id, keyId: "rzp_test_x" });
    const arg = rzp.orders.create.mock.calls[0][0];
    expect(arg.amount).toBe(pack.priceCents);
    expect(arg.currency).toBe("USD");
    expect(arg.receipt.length).toBeLessThanOrEqual(40);
    expect(arg.notes).toMatchObject({ workspaceId: ws.id, packId: pack.id, credits: String(pack.credits) });
    expect(res).toMatchObject({ order_id: "order_A", amount: pack.priceCents, currency: "USD", key_id: "rzp_test_x" });
  });

  it("rejects an unknown pack", async () => {
    await expect(createRazorpayCreditOrder({ workspace: ws, packId: "nope", keyId: "k" })).rejects.toThrow("Unknown credit pack");
  });
});

describe("fulfillRazorpayCreditPayment", () => {
  it("credits the pack once the signature and payment check out", async () => {
    const res = await fulfillRazorpayCreditPayment({ workspaceId: ws.id, orderId: "order_A", paymentId: "pay_A", signature: sig });
    expect(res).toEqual({ credits: pack.credits, recorded: true });
    expect(recordPurchase).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: ws.id, amount: pack.credits, stripeChargeId: "pay_A" }));
    expect(audit).toHaveBeenCalledOnce();
    expect(checkLowCredits).toHaveBeenCalledWith(ws.id);
  });

  it("a bad signature is a 400 and credits nothing", async () => {
    await expect(
      fulfillRazorpayCreditPayment({ workspaceId: ws.id, orderId: "order_A", paymentId: "pay_A", signature: "0".repeat(64) }),
    ).rejects.toMatchObject({ status: 400 });
    expect(rzp.orders.fetch).not.toHaveBeenCalled();
    expect(recordPurchase).not.toHaveBeenCalled();
  });

  it("refuses an order made for another workspace", async () => {
    await expect(
      fulfillRazorpayCreditPayment({ workspaceId: "ws_other", orderId: "order_A", paymentId: "pay_A", signature: sig }),
    ).rejects.toMatchObject({ status: 403 });
    expect(recordPurchase).not.toHaveBeenCalled();
  });

  it("refuses a payment whose amount does not match the order", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_A", order_id: "order_A", amount: 100, currency: "USD", status: "captured" });
    await expect(
      fulfillRazorpayCreditPayment({ workspaceId: ws.id, orderId: "order_A", paymentId: "pay_A", signature: sig }),
    ).rejects.toMatchObject({ status: 400 });
    expect(recordPurchase).not.toHaveBeenCalled();
  });

  it("captures an authorized payment before crediting", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_A", order_id: "order_A", amount: pack.priceCents, currency: "USD", status: "authorized" });
    rzp.payments.capture.mockResolvedValue({ id: "pay_A", status: "captured" });
    await fulfillRazorpayCreditPayment({ workspaceId: ws.id, orderId: "order_A", paymentId: "pay_A", signature: sig });
    expect(rzp.payments.capture).toHaveBeenCalledWith("pay_A", pack.priceCents, "USD");
    expect(recordPurchase).toHaveBeenCalledOnce();
  });

  it("a failed payment credits nothing", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_A", order_id: "order_A", amount: pack.priceCents, currency: "USD", status: "failed" });
    await expect(
      fulfillRazorpayCreditPayment({ workspaceId: ws.id, orderId: "order_A", paymentId: "pay_A", signature: sig }),
    ).rejects.toMatchObject({ status: 402 });
    expect(recordPurchase).not.toHaveBeenCalled();
  });

  it("a repeated verify does not audit twice", async () => {
    recordPurchase.mockResolvedValue({ recorded: false });
    const res = await fulfillRazorpayCreditPayment({ workspaceId: ws.id, orderId: "order_A", paymentId: "pay_A", signature: sig });
    expect(res.recorded).toBe(false);
    expect(audit).not.toHaveBeenCalled();
  });
});

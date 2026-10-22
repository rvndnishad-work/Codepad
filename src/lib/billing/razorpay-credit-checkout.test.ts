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
vi.mock("./fx", () => ({ getUsdInrRate: async () => ({ rate: 84.5, source: "live", at: "" }) }));
vi.mock("./pricing-copy-store", async () => {
  const { DEFAULT_PRICES } = await import("./prices");
  return { getEffectivePricing: async () => DEFAULT_PRICES };
});

import { razorpaySignature } from "@/lib/razorpay-signature";
import { DEFAULT_PRICES } from "./prices";
import { usdCentsToInrPaise } from "./fx-math";
import { createRazorpayCreditOrder, fulfillRazorpayCreditPayment } from "./razorpay-credit-checkout";

const SECRET = "unit_test_secret";
const pack = DEFAULT_PRICES.packs[0];
const PAISE = usdCentsToInrPaise(pack.priceCents, 84.5);
const ws = { id: "ws_123456789012345", name: "Acme", slug: "acme" };
const order = {
  id: "order_A",
  amount: PAISE,
  currency: "INR",
  notes: { kind: "AI_CREDIT_PACK", workspaceId: ws.id, packId: pack.id, credits: String(pack.credits) },
};
const sig = razorpaySignature("order_A", "pay_A", SECRET);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = "rzp_test_x";
  process.env.RAZORPAY_KEY_SECRET = SECRET;
  rzp.orders.fetch.mockResolvedValue(order);
  rzp.payments.fetch.mockResolvedValue({ id: "pay_A", order_id: "order_A", amount: PAISE, currency: "INR", status: "captured" });
  recordPurchase.mockResolvedValue({ recorded: true });
});

describe("createRazorpayCreditOrder", () => {
  it("creates a rupee order at the day's rate with the pack and rate in the notes", async () => {
    rzp.orders.create.mockResolvedValue({ id: "order_A", amount: PAISE, currency: "INR" });
    const res = await createRazorpayCreditOrder({ workspace: ws, packId: pack.id, keyId: "rzp_test_x" });
    const arg = rzp.orders.create.mock.calls[0][0];
    expect(PAISE % 100).toBe(0);
    expect(PAISE).toBe(Math.ceil((pack.priceCents / 100) * 84.5) * 100);
    expect(arg.amount).toBe(PAISE);
    expect(arg.currency).toBe("INR");
    expect(arg.receipt.length).toBeLessThanOrEqual(40);
    expect(arg.notes).toMatchObject({ workspaceId: ws.id, packId: pack.id, credits: String(pack.credits), usdCents: String(pack.priceCents), usdInrRate: "84.5" });
    expect(res).toMatchObject({ order_id: "order_A", amount: PAISE, currency: "INR", key_id: "rzp_test_x" });
  });

  it("refuses an order Razorpay made in another currency or amount", async () => {
    rzp.orders.create.mockResolvedValue({ id: "order_B", amount: pack.priceCents, currency: "USD" });
    await expect(createRazorpayCreditOrder({ workspace: ws, packId: pack.id, keyId: "k" })).rejects.toMatchObject({ status: 502 });
    rzp.orders.create.mockResolvedValue({ id: "order_C", amount: pack.priceCents, currency: "INR" });
    await expect(createRazorpayCreditOrder({ workspace: ws, packId: pack.id, keyId: "k" })).rejects.toMatchObject({ status: 502 });
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

  it("credits nothing for an order that is not in rupees", async () => {
    rzp.orders.fetch.mockResolvedValue({ ...order, currency: "USD", amount: pack.priceCents });
    rzp.payments.fetch.mockResolvedValue({ id: "pay_A", order_id: "order_A", amount: pack.priceCents, currency: "USD", status: "captured" });
    await expect(
      fulfillRazorpayCreditPayment({ workspaceId: ws.id, orderId: "order_A", paymentId: "pay_A", signature: sig }),
    ).rejects.toMatchObject({ status: 400 });
    expect(recordPurchase).not.toHaveBeenCalled();
  });

  it("a foreign card paying in its own currency is checked against the order's paid total", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_A", order_id: "order_A", amount: 3100, currency: "USD", status: "captured" });
    rzp.orders.fetch.mockResolvedValueOnce(order).mockResolvedValueOnce({ ...order, amount_paid: PAISE });
    await fulfillRazorpayCreditPayment({ workspaceId: ws.id, orderId: "order_A", paymentId: "pay_A", signature: sig });
    expect(recordPurchase).toHaveBeenCalledOnce();
  });

  it("an underpaid foreign-currency payment credits nothing", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_A", order_id: "order_A", amount: 100, currency: "USD", status: "captured" });
    rzp.orders.fetch.mockResolvedValueOnce(order).mockResolvedValueOnce({ ...order, amount_paid: 0 });
    await expect(
      fulfillRazorpayCreditPayment({ workspaceId: ws.id, orderId: "order_A", paymentId: "pay_A", signature: sig }),
    ).rejects.toMatchObject({ status: 402 });
    expect(recordPurchase).not.toHaveBeenCalled();
  });

  it("refuses a payment whose amount does not match the order", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_A", order_id: "order_A", amount: 100, currency: "INR", status: "captured" });
    await expect(
      fulfillRazorpayCreditPayment({ workspaceId: ws.id, orderId: "order_A", paymentId: "pay_A", signature: sig }),
    ).rejects.toMatchObject({ status: 400 });
    expect(recordPurchase).not.toHaveBeenCalled();
  });

  it("captures an authorized payment before crediting", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_A", order_id: "order_A", amount: PAISE, currency: "INR", status: "authorized" });
    rzp.payments.capture.mockResolvedValue({ id: "pay_A", status: "captured" });
    await fulfillRazorpayCreditPayment({ workspaceId: ws.id, orderId: "order_A", paymentId: "pay_A", signature: sig });
    expect(rzp.payments.capture).toHaveBeenCalledWith("pay_A", PAISE, "INR");
    expect(recordPurchase).toHaveBeenCalledOnce();
  });

  it("a failed payment credits nothing", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_A", order_id: "order_A", amount: PAISE, currency: "INR", status: "failed" });
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

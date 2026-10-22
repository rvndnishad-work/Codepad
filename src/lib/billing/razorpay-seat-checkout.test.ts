// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rzp = {
  orders: { create: vi.fn(), fetch: vi.fn() },
  payments: { fetch: vi.fn(), capture: vi.fn() },
};
vi.mock("razorpay", () => ({ default: vi.fn(function () { return rzp; }) }));

const db = vi.hoisted(() => ({
  workspaceMember: { count: vi.fn() },
  workspaceInvite: { count: vi.fn() },
  workspace: { findUnique: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
const audit = vi.fn();
vi.mock("@/lib/workspace-audit", () => ({
  writeWorkspaceAuditEntry: (...a: unknown[]) => audit(...a),
  WORKSPACE_AUDIT_ACTIONS: { SUBSCRIPTION_STARTED: "SUBSCRIPTION_STARTED", PLAN_CHANGED: "PLAN_CHANGED" },
}));
const grant = vi.fn();
vi.mock("./included-credits-server", () => ({ runIncludedCreditsIfDue: (...a: unknown[]) => grant(...a) }));
vi.mock("./fx", () => ({ getUsdInrRate: async () => ({ rate: 84.5, source: "live", at: "" }) }));
vi.mock("./pricing-copy-store", async () => {
  const { DEFAULT_PRICES } = await import("./prices");
  return { getEffectivePricing: async () => DEFAULT_PRICES };
});

import { razorpaySignature } from "@/lib/razorpay-signature";
import { DEFAULT_PRICES } from "./prices";
import { usdCentsToInrPaise } from "./fx-math";
import { createRazorpaySeatOrder, fulfillRazorpaySeatPayment } from "./razorpay-seat-checkout";

const SECRET = "unit_test_secret";
const ws = { id: "ws_123456789012345", name: "Acme", slug: "acme", stripeSubscriptionId: null, planName: "FREE" };
const USD = 3 * DEFAULT_PRICES.growth.annualMonthlyCents * 12;
const PAISE = usdCentsToInrPaise(USD, 84.5);
const order = {
  id: "order_S",
  amount: PAISE,
  currency: "INR",
  notes: { kind: "GROWTH_SEATS", workspaceId: ws.id, seats: "3", cadence: "annual", usdCents: String(USD) },
};
const sig = razorpaySignature("order_S", "pay_S", SECRET);
const now = new Date("2026-10-22T10:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = "rzp_test_x";
  process.env.RAZORPAY_KEY_SECRET = SECRET;
  db.workspaceMember.count.mockResolvedValue(2);
  db.workspaceInvite.count.mockResolvedValue(1);
  rzp.orders.fetch.mockResolvedValue(order);
  rzp.payments.fetch.mockResolvedValue({ id: "pay_S", order_id: "order_S", amount: PAISE, currency: "INR", status: "captured" });
  db.workspace.findUnique.mockResolvedValue({ planName: "FREE", prepaidThrough: null, prepaidLastPaymentId: null });
  db.workspace.updateMany.mockResolvedValue({ count: 1 });
});

describe("createRazorpaySeatOrder", () => {
  it("prices seats x a year at the yearly seat price, in rupees", async () => {
    rzp.orders.create.mockResolvedValue({ id: "order_S", amount: PAISE, currency: "INR" });
    const res = await createRazorpaySeatOrder({ workspace: ws, seats: 3, cadence: "annual", keyId: "rzp_test_x" });
    const arg = rzp.orders.create.mock.calls[0][0];
    expect(arg).toMatchObject({ amount: PAISE, currency: "INR" });
    expect(arg.receipt.length).toBeLessThanOrEqual(40);
    expect(arg.notes).toMatchObject({ kind: "GROWTH_SEATS", workspaceId: ws.id, seats: "3", cadence: "annual", usdCents: String(USD) });
    expect(res).toMatchObject({ order_id: "order_S", amount: PAISE, currency: "INR" });
  });

  it("refuses fewer seats than members plus pending invites", async () => {
    await expect(createRazorpaySeatOrder({ workspace: ws, seats: 2, cadence: "annual", keyId: "k" })).rejects.toMatchObject({ status: 400 });
    expect(rzp.orders.create).not.toHaveBeenCalled();
  });

  it("refuses a workspace that already pays through Stripe, or Enterprise", async () => {
    await expect(createRazorpaySeatOrder({ workspace: { ...ws, stripeSubscriptionId: "sub_1" }, seats: 3, cadence: "annual", keyId: "k" })).rejects.toMatchObject({ status: 409 });
    await expect(createRazorpaySeatOrder({ workspace: { ...ws, planName: "ENTERPRISE" }, seats: 3, cadence: "annual", keyId: "k" })).rejects.toMatchObject({ status: 409 });
  });

  it("refuses an order Razorpay made for another amount", async () => {
    rzp.orders.create.mockResolvedValue({ id: "order_S", amount: USD, currency: "INR" });
    await expect(createRazorpaySeatOrder({ workspace: ws, seats: 3, cadence: "annual", keyId: "k" })).rejects.toMatchObject({ status: 502 });
  });
});

describe("fulfillRazorpaySeatPayment", () => {
  it("turns on Growth for a year with the seats paid for", async () => {
    const res = await fulfillRazorpaySeatPayment({ workspaceId: ws.id, orderId: "order_S", paymentId: "pay_S", signature: sig, now });
    expect(res).toEqual({ seats: 3, cadence: "annual", paidThrough: "2027-10-22T10:00:00.000Z", applied: true });
    expect(db.workspace.updateMany).toHaveBeenCalledWith({
      where: { id: ws.id, prepaidLastPaymentId: null },
      data: expect.objectContaining({ planName: "GROWTH", prepaidSeats: 3, prepaidCadence: "annual", prepaidLastPaymentId: "pay_S", prepaidReminderAt: null }),
    });
    expect(audit.mock.calls.map((c) => (c[0] as { action: string }).action)).toEqual(["SUBSCRIPTION_STARTED", "PLAN_CHANGED"]);
    expect(grant).toHaveBeenCalledWith(ws.id, now);
  });

  it("renewing early adds the year to the current end", async () => {
    db.workspace.findUnique.mockResolvedValue({ planName: "GROWTH", prepaidThrough: new Date("2027-01-01T00:00:00Z"), prepaidLastPaymentId: "pay_OLD" });
    const res = await fulfillRazorpaySeatPayment({ workspaceId: ws.id, orderId: "order_S", paymentId: "pay_S", signature: sig, now });
    expect(res.paidThrough).toBe("2028-01-01T00:00:00.000Z");
    expect(audit).toHaveBeenCalledOnce();
  });

  it("a repeated verify for the same payment never extends twice", async () => {
    db.workspace.findUnique.mockResolvedValue({ planName: "GROWTH", prepaidThrough: new Date("2027-10-22T10:00:00Z"), prepaidLastPaymentId: "pay_S" });
    const res = await fulfillRazorpaySeatPayment({ workspaceId: ws.id, orderId: "order_S", paymentId: "pay_S", signature: sig, now });
    expect(res.applied).toBe(false);
    expect(db.workspace.updateMany).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("a credit pack order cannot be used to unlock Growth", async () => {
    rzp.orders.fetch.mockResolvedValue({ ...order, notes: { kind: "AI_CREDIT_PACK", workspaceId: ws.id } });
    await expect(fulfillRazorpaySeatPayment({ workspaceId: ws.id, orderId: "order_S", paymentId: "pay_S", signature: sig, now })).rejects.toMatchObject({ status: 403 });
    expect(db.workspace.updateMany).not.toHaveBeenCalled();
  });

  it("a bad signature applies nothing", async () => {
    await expect(
      fulfillRazorpaySeatPayment({ workspaceId: ws.id, orderId: "order_S", paymentId: "pay_S", signature: "0".repeat(64), now }),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.workspace.updateMany).not.toHaveBeenCalled();
  });
});

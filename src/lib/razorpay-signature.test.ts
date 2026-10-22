// @vitest-environment node
import { describe, expect, it } from "vitest";
import { razorpaySignature, verifyRazorpaySignature } from "./razorpay-signature";

// Expected digest from: printf 'order_IEIaMR65cu6nz3|pay_IH4NVgf4Dreq1l' | openssl dgst -sha256 -hmac test_secret
const orderId = "order_IEIaMR65cu6nz3";
const paymentId = "pay_IH4NVgf4Dreq1l";
const secret = "test_secret";
const good = "2d67c3fceac8e3487e54e2d6ea7815a350a8562ed56d521a80eb43a393e9ab52";

describe("Razorpay signature", () => {
  it("is HMAC-SHA256 of order_id|payment_id, hex", () => {
    expect(razorpaySignature(orderId, paymentId, secret)).toBe(good);
  });

  it("accepts the matching signature", () => {
    expect(verifyRazorpaySignature({ orderId, paymentId, signature: good, secret })).toBe(true);
  });

  it("rejects a tampered signature, swapped ids, a wrong secret or missing fields", () => {
    expect(verifyRazorpaySignature({ orderId, paymentId, signature: good.replace(/.$/, "0"), secret })).toBe(false);
    expect(verifyRazorpaySignature({ orderId: paymentId, paymentId: orderId, signature: good, secret })).toBe(false);
    expect(verifyRazorpaySignature({ orderId, paymentId, signature: good, secret: "other" })).toBe(false);
    expect(verifyRazorpaySignature({ orderId, paymentId, signature: "short", secret })).toBe(false);
    expect(verifyRazorpaySignature({ orderId, paymentId, signature: good, secret: "" })).toBe(false);
    expect(verifyRazorpaySignature({ orderId: "", paymentId, signature: good, secret })).toBe(false);
  });
});

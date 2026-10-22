// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/razorpay", () => ({ getRazorpay: vi.fn(), verifyRazorpaySignature: vi.fn() }));
vi.mock("./razorpay-credit-checkout", () => ({
  RAZORPAY_MIN_AMOUNT: 100,
  RazorpayCheckoutError: class extends Error {
    constructor(m: string, public status = 400) {
      super(m);
    }
  },
}));
import { parseTestAmount } from "./razorpay-test-payment";

describe("parseTestAmount", () => {
  it("turns major units into minor units", () => {
    expect(parseTestAmount("29.50", "INR")).toEqual({ minor: 2950, currency: "INR" });
    expect(parseTestAmount(1, "USD")).toEqual({ minor: 100, currency: "USD" });
  });
  it("rejects bad input", () => {
    expect(() => parseTestAmount("0.5", "INR")).toThrow("smallest");
    expect(() => parseTestAmount("1.234", "INR")).toThrow("two decimal");
    expect(() => parseTestAmount("abc", "INR")).toThrow("Enter an amount");
    expect(() => parseTestAmount("10", "EUR")).toThrow("INR or USD");
    expect(() => parseTestAmount("50000.01", "INR")).toThrow("capped");
  });
});

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
const run = vi.fn();
vi.mock("@/lib/billing/razorpay-client", () => ({ runRazorpayCheckout: (...a: unknown[]) => run(...a) }));

import GrowthCheckout, { type GrowthCheckoutData } from "./GrowthCheckout";

const data: GrowthCheckoutData = {
  provider: "razorpay",
  price: { monthlyCents: 4900, annualMonthlyCents: 3900 },
  inrRate: 84.5,
  minSeats: 3,
  initialCadence: "annual",
  prepaid: null,
};

describe("GrowthCheckout", () => {
  it("prices the yearly seats, then the monthly ones, and pays with the chosen seats", async () => {
    run.mockResolvedValue({ status: "cancelled" });
    render(<GrowthCheckout slug="acme" data={data} onStripe={vi.fn()} onClose={vi.fn()} notify={vi.fn()} />);
    // 3 seats x $39 x 12 = $1,404.
    expect(screen.getByText("$1,404")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Monthly"));
    expect(screen.getByText("$147")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Seats"), { target: { value: "5" } });
    expect(screen.getByText("$245")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pay and start Growth" }));
    expect(run).toHaveBeenCalledWith(expect.objectContaining({
      createUrl: "/api/w/acme/billing/razorpay/seats/order",
      createBody: { seats: 5, cadence: "monthly" },
      verifyUrl: "/api/w/acme/billing/razorpay/seats/verify",
    }));
  });

  it("will not pay for fewer seats than people in the workspace", () => {
    render(<GrowthCheckout slug="acme" data={data} onStripe={vi.fn()} onClose={vi.fn()} notify={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Seats"), { target: { value: "2" } });
    expect((screen.getByRole("button", { name: "Pay and start Growth" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("with Stripe, only the period is chosen and Stripe takes over", () => {
    const onStripe = vi.fn();
    render(<GrowthCheckout slug="acme" data={{ ...data, provider: "stripe" }} onStripe={onStripe} onClose={vi.fn()} notify={vi.fn()} />);
    expect(screen.queryByLabelText("Seats")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continue to checkout" }));
    expect(onStripe).toHaveBeenCalledWith("annual");
  });
});

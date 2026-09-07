import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StarLottie, { SparkleFallback } from "@/app/dashboard/galaxy/StarLottie";
import { STAR_LOTTIE } from "@/app/dashboard/galaxy/sparkleAnimation";
import DashboardHero from "@/app/dashboard/DashboardHero";

describe("galaxy lottie", () => {
  it("ships a structurally valid animation", () => {
    expect(STAR_LOTTIE.v).toMatch(/^5\./);
    expect(STAR_LOTTIE.fr).toBeGreaterThan(0);
    expect(STAR_LOTTIE.op).toBeGreaterThan(STAR_LOTTIE.ip);
    expect(STAR_LOTTIE.layers.length).toBe(3);
    for (const layer of STAR_LOTTIE.layers) {
      expect((layer as unknown as { shapes?: unknown[] }).shapes?.length).toBeGreaterThan(0);
    }
  });

  it("renders the CSS fallback without throwing (jsdom has no canvas for lottie-web)", async () => {
    render(<StarLottie size={64} />);
    expect(await screen.findByTestId("gx-star-fallback")).toBeTruthy();
  });

  it("fallback star scales with the requested size", () => {
    const { container } = render(<SparkleFallback size={42} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe("42px");
    expect(el.style.height).toBe("42px");
  });
});

describe("dashboard hero", () => {
  it("greets by first name and links the launch paths", async () => {
    const { container } = render(<DashboardHero userName="Ada Lovelace" />);
    expect(await screen.findByText("Hey Ada,")).toBeTruthy();
    expect(screen.getByText("chart your next build.")).toBeTruthy();
    const launch = screen.getByText("Launch Sandbox").closest("a");
    const explore = screen.getByText("Explore the Galaxy").closest("a");
    expect(launch?.getAttribute("href")).toBe("/");
    expect(explore?.getAttribute("href")).toBe("/explore");
    const pods = container.querySelectorAll("[data-gx='pod']");
    expect(pods.length).toBe(3);
    expect(pods[0].getAttribute("href")).toBe("/play?template=react");
  });
});

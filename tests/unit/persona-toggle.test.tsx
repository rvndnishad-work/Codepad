import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomeWowHero from "@/components/home-wow/HomeWowHero";

// The 3D scene pulls three.js — stub it so this unit file stays fast.
vi.mock("@/components/wow/CodeVerse3D", () => ({
  default: () => null,
}));

const STATS = { questions: 1600, challenges: 150, sessions: 900 };

describe("home hero persona toggle", () => {
  it("renders the hiring teams button with an arrow to /hire", () => {
    render(<HomeWowHero stats={STATS} />);
    const hireLink = screen.getByText("Hiring? Interviewpad for teams").closest("a");
    expect(hireLink).toBeTruthy();
    expect(hireLink?.getAttribute("href")).toBe("/hire");
    // lucide renders an inline svg inside the link — assert the arrow icon exists.
    expect(hireLink?.querySelector("svg")).toBeTruthy();
  });

  it("keeps the persona switch pointing at the hire page", () => {
    render(<HomeWowHero stats={STATS} />);
    const nav = screen.getByRole("navigation", { name: "Choose your view" });
    expect(nav.textContent).toMatch(/Developers/);
    const hiringLink = screen.getByText(/Hiring teams/).closest("a");
    expect(hiringLink?.getAttribute("href")).toBe("/hire");
  });
});

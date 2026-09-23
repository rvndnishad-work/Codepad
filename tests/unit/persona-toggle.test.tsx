import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HomeWowHero from "@/components/home-wow/HomeWowHero";

const STATS = { questions: 1600, techs: 14, challenges: 150, sessions: 900 };

describe("home hero persona toggle", () => {
  it("keeps the persona switch pointing at the hire page", () => {
    render(<HomeWowHero stats={STATS} />);
    const nav = screen.getByRole("navigation", { name: "Choose your view" });
    expect(nav.textContent).toMatch(/developers/i);
    const hiringLink = screen.getByText(/hiring teams/i).closest("a");
    expect(hiringLink?.getAttribute("href")).toBe("/hire");
  });

  it("makes the persona switch the only route to /hire", () => {
    const { container } = render(<HomeWowHero stats={STATS} />);
    const hireLinks = container.querySelectorAll('a[href="/hire"]');
    expect(hireLinks).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Choose your view" }).contains(hireLinks[0])).toBe(true);
  });

  it("offers one primary and one secondary action", () => {
    render(<HomeWowHero stats={STATS} />);
    expect(screen.getByText("Start a challenge").closest("a")?.getAttribute("href")).toBe("/challenges");
    expect(screen.getByText("Browse questions").closest("a")?.getAttribute("href")).toBe("/interview-questions");
  });

  it("swaps the secondary action for the latest sandbox when there is one", () => {
    render(<HomeWowHero stats={STATS} recentSnippet={{ slug: "abc123", title: "Scratch" }} />);
    expect(screen.getByText("Resume your sandbox").closest("a")?.getAttribute("href")).toBe("/play/abc123");
    expect(screen.queryByText("Browse questions")).toBeNull();
  });

  it("leaves out stats whose count is zero", () => {
    render(<HomeWowHero stats={{ ...STATS, sessions: 0 }} />);
    expect(screen.queryAllByText("sessions run")).toHaveLength(0);
    expect(screen.queryAllByText("coding challenges").length).toBeGreaterThan(0);
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Terminal } from "lucide-react";
import {
  PaneTitle,
  LiveBadge,
  UrlPill,
  ClearButton,
  RefreshPreviewButton,
} from "@/components/OutputPaneChrome";

describe("OutputPaneChrome", () => {
  it("PaneTitle renders an icon lockup with the label", () => {
    render(<PaneTitle icon={Terminal}>Console</PaneTitle>);
    expect(screen.getByText("Console")).toBeTruthy();
  });

  it("LiveBadge signals a live stream", () => {
    render(<LiveBadge />);
    expect(screen.getByText("Live")).toBeTruthy();
  });

  it("UrlPill shows the sandbox origin", () => {
    render(<UrlPill />);
    expect(screen.getByText("localhost:3000")).toBeTruthy();
  });

  it("ClearButton fires onClear and labels itself when roomy", () => {
    const onClear = vi.fn();
    render(<ClearButton onClear={onClear} />);
    const btn = screen.getByTitle("Clear console");
    expect(btn.textContent).toContain("Clear");
    fireEvent.click(btn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("ClearButton collapses to icon-only in tight headers", () => {
    render(<ClearButton onClear={vi.fn()} showLabel={false} />);
    const btn = screen.getByTitle("Clear console");
    expect(btn.textContent).not.toContain("Clear");
  });

  it("RefreshPreviewButton fires onRefresh", () => {
    const onRefresh = vi.fn();
    render(<RefreshPreviewButton onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole("button", { name: /refresh preview/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it } from "vitest";
import {
  CONSOLE_SPLIT,
  PANE,
  PHONE_SPLIT,
  editorMaxWidth,
  effectiveView,
  explorerCrowdsPrompt,
  phoneEditorSplit,
  resolveDesktopLayout,
  startsWithExplorerCollapsed,
  type OutputView,
} from "@/lib/playground-layout";

const VIEWPORTS = [768, 820, 1024, 1280, 1440, 1920, 2560];
const VIEWS: OutputView[] = ["preview", "both", "columns"];

describe("playground starting layout", () => {
  it("collapses the explorer below 1100px only", () => {
    expect(startsWithExplorerCollapsed(1024)).toBe(true);
    expect(startsWithExplorerCollapsed(1099)).toBe(true);
    expect(startsWithExplorerCollapsed(1100)).toBe(false);
  });

  for (const viewport of VIEWPORTS) {
    for (const view of VIEWS) {
      it(`${viewport}px, ${view}: every panel keeps a usable size`, () => {
        const l = resolveDesktopLayout({
          viewport,
          view,
          explorerCollapsed: startsWithExplorerCollapsed(viewport),
        });
        expect(l.editor).toBeGreaterThanOrEqual(PANE.editorMin);
        expect(l.output).toBeGreaterThanOrEqual(PANE.outputMin);
        if (l.view === "columns") {
          expect(l.preview).toBeGreaterThanOrEqual(280);
          expect(l.console).toBeGreaterThanOrEqual(180);
        }
        expect(l.left + PANE.divider + l.editor + l.output).toBe(viewport);
      });
    }
  }

  it("a stale wide editor gives way to side by side instead of crushing the preview", () => {
    // The bug: a 900px editor preference on a 1440px screen left the preview a sliver.
    const l = resolveDesktopLayout({ viewport: 1440, view: "columns", explorerCollapsed: false, editorPreferred: 1200 });
    expect(l.output).toBeGreaterThanOrEqual(PANE.outputMinColumns);
    expect(l.preview).toBeGreaterThan(300);
    // Back in preview-only the editor may use more of its preference again.
    const p = resolveDesktopLayout({ viewport: 1440, view: "preview", explorerCollapsed: false, editorPreferred: 1200 });
    expect(p.editor).toBeGreaterThan(l.editor);
  });

  it("the console split is clamped so neither panel can vanish", () => {
    const tiny = resolveDesktopLayout({ viewport: 1440, view: "columns", explorerCollapsed: false, consoleSplit: 99 });
    expect(tiny.console / tiny.output).toBeLessThanOrEqual(CONSOLE_SPLIT.columns.max / 100 + 0.01);
    const none = resolveDesktopLayout({ viewport: 1440, view: "columns", explorerCollapsed: false, consoleSplit: 1 });
    expect(none.console / none.output).toBeGreaterThanOrEqual(CONSOLE_SPLIT.columns.min / 100 - 0.01);
  });

  it("side by side stacks where it cannot fit, and on phones", () => {
    expect(effectiveView("columns", { isBackend: false, isMobile: false, viewport: 820, left: PANE.explorerRail })).toBe("both");
    expect(effectiveView("columns", { isBackend: false, isMobile: false, viewport: 1024, left: PANE.explorerRail })).toBe("columns");
    expect(effectiveView("columns", { isBackend: false, isMobile: true, viewport: 1024, left: 0 })).toBe("both");
    expect(effectiveView("preview", { isBackend: true, isMobile: false, viewport: 1440, left: 0 })).toBe("console");
  });

  it("the AI panel takes room from the editor, not the output", () => {
    const max = editorMaxWidth(1440, 40 + 385, "columns", false);
    expect(1440 - 40 - 385 - 1 - max).toBe(PANE.outputMinColumns);
  });
});

describe("phone stacking", () => {
  it("gives the editor less height when preview and console share the rest", () => {
    expect(phoneEditorSplit("preview")).toBe(PHONE_SPLIT.editor.single);
    expect(phoneEditorSplit("console")).toBe(PHONE_SPLIT.editor.single);
    expect(phoneEditorSplit("both")).toBe(PHONE_SPLIT.editor.split);
    expect(PHONE_SPLIT.editor.split).toBeLessThan(PHONE_SPLIT.editor.single);
  });
});

describe("AI panel next to the explorer", () => {
  it("tucks the files away where they would crowd out the output", () => {
    expect(explorerCrowdsPrompt(1280, PANE.explorerDefault, PANE.promptDefault)).toBe(true);
    expect(explorerCrowdsPrompt(1440, PANE.explorerDefault, PANE.promptDefault)).toBe(false);
    expect(explorerCrowdsPrompt(1920, PANE.explorerMax, PANE.promptMax)).toBe(false);
  });

  it("leaves the output its minimum once the files are tucked away", () => {
    for (const viewport of [1100, 1280]) {
      const l = resolveDesktopLayout({ viewport, view: "preview", explorerCollapsed: true, promptOpen: true });
      expect(l.output).toBeGreaterThanOrEqual(PANE.outputMin);
    }
  });
});

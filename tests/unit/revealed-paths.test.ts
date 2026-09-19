import { describe, expect, it } from "vitest";
import {
  markRevealed,
  isRevealed,
  clearRevealed,
  isHiddenEntry,
  classifyCollision,
  resolveHidden,
} from "@/lib/revealed-paths";
import { templatesById } from "@/lib/templates";

/**
 * Regression: creating `styles.css` in the Empty React template reported
 * `"styles.css" already exists` even though no such file is visible.
 * Root cause: the template ships a *hidden* `/styles.css` scaffold that
 * exists in `sandpack.files` but is filtered out of the explorer tree.
 * `classifyCollision` must report that case as `hidden-scaffold` (reveal
 * the entry) rather than `duplicate` (toast + abort).
 */
describe("revealed-paths", () => {
  it("empty-react really does ship a hidden /styles.css scaffold", () => {
    const files = templatesById["empty-react"].files as Record<
      string,
      string | { code: string; hidden?: boolean }
    >;
    expect(files["/styles.css"]).toBeDefined();
    expect(isHiddenEntry(files["/styles.css"])).toBe(true);
  });

  it("classifies a hidden scaffold collision as revealable, not duplicate", () => {
    const hiddenScaffold = { code: "", hidden: true };
    // Explorer's visible path list never contains hidden entries.
    const visiblePaths = ["/App.js", "/index.js", "/package.json"];
    expect(
      classifyCollision(hiddenScaffold, visiblePaths, "/styles.css"),
    ).toBe("hidden-scaffold");
  });

  it("still reports genuinely visible collisions as duplicates", () => {
    expect(
      classifyCollision({ code: "x" }, ["/App.js"], "/App.js"),
    ).toBe("duplicate");
    expect(classifyCollision(undefined, ["/App.js"], "/App.js")).toBe(
      "duplicate",
    );
    expect(classifyCollision(undefined, ["/App.js"], "/New.js")).toBe("free");
  });

  it("resolveHidden keeps revealed paths visible, hides the rest", () => {
    const tpl = "empty-react";
    clearRevealed(tpl);
    // Untouched scaffold: stays hidden.
    expect(resolveHidden(true, false, tpl, "/styles.css")).toBe(true);
    // User revealed it: stays visible and is saved visible.
    markRevealed(tpl, "/styles.css");
    expect(isRevealed(tpl, "/styles.css")).toBe(true);
    expect(resolveHidden(true, false, tpl, "/styles.css")).toBe(false);
    // A currently-hidden file is always reported hidden.
    expect(resolveHidden(false, true, tpl, "/other.css")).toBe(true);
    // Reveal marks are scoped per template and cleared on remount.
    expect(isRevealed("empty-js", "/styles.css")).toBe(false);
    clearRevealed(tpl);
    expect(isRevealed(tpl, "/styles.css")).toBe(false);
  });
});

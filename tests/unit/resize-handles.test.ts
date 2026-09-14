import { describe, expect, it, vi } from "vitest";
import { onResizeKey, RESIZE_RAIL_X, RESIZE_RAIL_Y } from "@/hooks/useResizable";

function keyEvent(key: string) {
  const preventDefault = vi.fn();
  return { e: { key, preventDefault } as unknown as React.KeyboardEvent, preventDefault };
}

describe("resize handle helpers", () => {
  it("maps arrows to nudge directions", () => {
    const nudge = vi.fn();
    for (const [key, dir] of [["ArrowRight", 1], ["ArrowDown", 1], ["ArrowLeft", -1], ["ArrowUp", -1]] as const) {
      const { e, preventDefault } = keyEvent(key);
      onResizeKey(e, nudge);
      expect(preventDefault).toHaveBeenCalled();
      expect(nudge).toHaveBeenLastCalledWith(dir);
    }
  });

  it("ignores non-arrow keys", () => {
    const nudge = vi.fn();
    const { e, preventDefault } = keyEvent("Enter");
    onResizeKey(e, nudge);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(nudge).not.toHaveBeenCalled();
  });

  it("rails carry an invisible grab zone + focus ring", () => {
    expect(RESIZE_RAIL_X).toContain("before:-inset-x-2");
    expect(RESIZE_RAIL_Y).toContain("before:-inset-y-2");
    expect(RESIZE_RAIL_X).toContain("focus-visible:");
    expect(RESIZE_RAIL_Y).toContain("focus-visible:");
  });
});

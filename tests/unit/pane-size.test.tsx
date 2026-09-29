import { afterEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { ResizeHandle, usePaneSize } from "@/components/playground/Chrome";

const KEY = "test:pane";

afterEach(() => window.localStorage.clear());

describe("usePaneSize", () => {
  it("starts from the initial size when nothing is stored", () => {
    const { result } = renderHook(() => usePaneSize({ storageKey: KEY, initial: 500, min: 280, max: 900 }));
    expect(result.current.value).toBe(500);
  });

  it("clamps a stored preference without overwriting it", () => {
    window.localStorage.setItem(KEY, "1200");
    const { result, rerender } = renderHook(({ max }) => usePaneSize({ storageKey: KEY, initial: 500, min: 280, max }), {
      initialProps: { max: 700 },
    });
    expect(result.current.value).toBe(700);
    expect(window.localStorage.getItem(KEY)).toBe("1200");
    // More room later: the stored preference comes back.
    rerender({ max: 1400 });
    expect(result.current.value).toBe(1200);
  });

  it("persists what the user sets, clamped", () => {
    const { result } = renderHook(() => usePaneSize({ storageKey: KEY, initial: 40, min: 20, max: 80, unit: "%" }));
    act(() => result.current.set(95));
    expect(result.current.value).toBe(80);
    expect(window.localStorage.getItem(KEY)).toBe("80");
  });

  it("ignores a stored value that is not a number", () => {
    window.localStorage.setItem(KEY, "wide");
    const { result } = renderHook(() => usePaneSize({ storageKey: KEY, initial: 45, min: 30, max: 70 }));
    expect(result.current.value).toBe(45);
  });
});

describe("ResizeHandle steps", () => {
  it("uses the given step and big step for arrow keys", () => {
    const seen: number[] = [];
    render(
      <ResizeHandle
        orientation="vertical"
        label="Resize console"
        value={45}
        min={30}
        max={70}
        onPointerDown={() => {}}
        onResize={(n) => seen.push(n)}
        invert
        step={2}
        bigStep={10}
      />,
    );
    const handle = screen.getByRole("separator", { name: "Resize console" });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
    expect(seen).toEqual([47, 35]);
  });
});

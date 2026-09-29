import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useSandpack } from "@codesandbox/sandpack-react";
import SharedSandpack from "@/components/SharedSandpack";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  const { sandpack } = useSandpack();
  const f = sandpack.files["/App.js"];
  return <pre data-testid="code">{f?.code}</pre>;
}

describe("SharedSandpack", () => {
  it("keeps shared edits in the bundler across re-renders", async () => {
    vi.useFakeTimers();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const render = (code: string, tick: number) =>
      root.render(
        <SharedSandpack template="react" dependencies={{ react: "^19.2.8" }} fixed={{}} files={{ "/App.js": code }} tick={tick}>
          <Probe />
        </SharedSandpack>,
      );
    const read = () => host.querySelector("pre")?.textContent;
    await act(async () => render("start", 0));
    expect(read()).toBe("start");
    // No pause needed: each shared edit reaches the bundler straight away.
    await act(async () => render("edited once", 1));
    expect(read()).toBe("edited once");
    // Unrelated re-renders (the other side typing in another file, a tab
    // switch) must not put the starter code back.
    await act(async () => render("edited once", 2));
    await act(async () => vi.advanceTimersByTime(600));
    expect(read()).toBe("edited once");
    await act(async () => render("edited twice", 3));
    await act(async () => vi.advanceTimersByTime(600));
    expect(read()).toBe("edited twice");
    await act(async () => root.unmount());
    vi.useRealTimers();
  });
});

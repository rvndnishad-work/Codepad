import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { LivePreviewBridge, filesDiffer } from "@/components/bridges/LivePreviewBridge";
import { ErrorBridge } from "@/components/ErrorOverlay";

type Files = Record<string, { code: string }>;
type Msg = { type: string };

const { sp } = vi.hoisted(() => {
  const sp = {
    files: {} as Record<string, { code: string }>,
    status: "running",
    error: null as null | { message: string; title?: string; path?: string; line?: number },
    listeners: new Set<(m: { type: string }) => void>(),
    client: {
      sandboxSetup: { files: {} as Record<string, { code: string }> },
      updateSandbox: (_: unknown) => {},
    },
  };
  return { sp };
});

vi.mock("@codesandbox/sandpack-react", () => ({
  useSandpack: () => ({
    sandpack: {
      files: sp.files,
      status: sp.status,
      error: sp.error,
      environment: "create-react-app",
      clients: { preview: sp.client },
    },
    listen: (fn: (m: Msg) => void) => {
      sp.listeners.add(fn);
      return () => sp.listeners.delete(fn);
    },
  }),
}));

const emit = (m: Msg) => sp.listeners.forEach((fn) => fn(m));
const f = (code: string): Files => ({ "/App.js": { code } });

describe("filesDiffer", () => {
  it("compares paths and code, not identity", () => {
    expect(filesDiffer(f("a"), f("a"))).toBe(false);
    expect(filesDiffer(f("a"), f("ab"))).toBe(true);
    expect(filesDiffer(f("a"), { ...f("a"), "/x.js": { code: "" } })).toBe(true);
    expect(filesDiffer(undefined, f("a"))).toBe(true);
  });
});

describe("LivePreviewBridge", () => {
  let sent: Files[];
  beforeEach(() => {
    sent = [];
    sp.listeners.clear();
    sp.status = "running";
    sp.client.updateSandbox = (setup: unknown) => {
      const files = (setup as { files: Files }).files;
      sent.push(files);
      sp.client.sandboxSetup.files = files;
    };
  });

  it("re-sends edits dropped during a busy compile once it finishes", () => {
    // Bundler compiled "a"; the user kept typing to "abc" while it was busy.
    sp.client.sandboxSetup.files = f("a");
    sp.files = f("abc");
    render(<LivePreviewBridge enabled />);
    act(() => emit({ type: "done" }));
    expect(sent).toEqual([f("abc")]);
    // The follow-up compile finishes with nothing new: no extra send.
    act(() => emit({ type: "done" }));
    expect(sent).toHaveLength(1);
  });

  it("does nothing when the preview is current, stopped, or disabled", () => {
    sp.client.sandboxSetup.files = f("same");
    sp.files = f("same");
    const { unmount } = render(<LivePreviewBridge enabled />);
    act(() => emit({ type: "done" }));
    unmount();

    sp.files = f("newer");
    sp.status = "idle";
    const r2 = render(<LivePreviewBridge enabled />);
    act(() => emit({ type: "done" }));
    r2.unmount();

    sp.status = "running";
    render(<LivePreviewBridge enabled={false} />);
    act(() => emit({ type: "done" }));
    expect(sent).toEqual([]);
  });
});

describe("ErrorBridge while typing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sp.listeners.clear();
    sp.error = null;
  });
  afterEach(() => vi.useRealTimers());

  it("holds back an error that clears before the show delay", () => {
    const onError = vi.fn();
    const { rerender } = render(<ErrorBridge onError={onError} />);
    sp.error = { message: "Unexpected token" };
    rerender(<ErrorBridge onError={onError} />);
    act(() => vi.advanceTimersByTime(300));
    sp.error = null;
    rerender(<ErrorBridge onError={onError} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(onError).not.toHaveBeenCalled();
  });

  it("shows an error that persists", () => {
    const onError = vi.fn();
    const { rerender } = render(<ErrorBridge onError={onError} />);
    sp.error = { message: "x is not defined" };
    rerender(<ErrorBridge onError={onError} />);
    act(() => vi.advanceTimersByTime(700));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toContain("x is not defined");
  });
});

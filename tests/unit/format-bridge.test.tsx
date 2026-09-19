import { describe, expect, it, vi, beforeEach } from "vitest";
import { useRef, useEffect } from "react";
import { render, act } from "@testing-library/react";
import {
  FormatBridge,
  type FormatResult,
} from "@/components/bridges/FormatBridge";

const { store, spies, toastFns } = vi.hoisted(() => {
  const store: { files: Record<string, { code: string }> } = { files: {} };
  const spies = { updateFile: vi.fn() };
  const toastFns = { error: vi.fn(), success: vi.fn(), plain: vi.fn() };
  return { store, spies, toastFns };
});

vi.mock("sonner", () => ({
  toast: Object.assign(
    (...args: unknown[]) => toastFns.plain(...args),
    { error: (...args: unknown[]) => toastFns.error(...args), success: (...args: unknown[]) => toastFns.success(...args) },
  ),
  Toaster: () => null,
}));

vi.mock("@codesandbox/sandpack-react", () => ({
  useSandpack: () => ({
    sandpack: {
      get files() {
        return store.files;
      },
      get activeFile() {
        return "/a.js";
      },
      updateFile: (path: string, code: string) => {
        spies.updateFile(path, code);
        store.files = { ...store.files, [path]: { code } };
      },
    },
  }),
}));

type FormatFn = (opts?: { quiet?: boolean }) => Promise<FormatResult | null>;

function Harness({ onRef }: { onRef: (fn: FormatFn | null) => void }) {
  const formatRef = useRef<FormatFn | null>(null);
  useEffect(() => {
    onRef(formatRef.current);
  });
  return <FormatBridge formatRef={formatRef as never} />;
}

async function mountWith(code: string): Promise<FormatFn> {
  store.files = { "/a.js": { code } };
  let fn: FormatFn | null = null;
  render(<Harness onRef={(f) => (fn = f)} />);
  await act(async () => {});
  if (!fn) throw new Error("formatRef never set");
  return fn;
}

beforeEach(() => {
  for (const s of Object.values(spies)) s.mockClear();
  for (const t of Object.values(toastFns)) t.mockClear();
});

/**
 * Contract for the format action behind Ctrl+Shift+F and format-on-save.
 * Uses the real Prettier: rewrites + reports unformatted code, stays silent
 * on clean or unsupported files, and `quiet` suppresses all toasts (saves).
 */
describe("FormatBridge", () => {
  it("rewrites unformatted code and reports changed", async () => {
    const fn = await mountWith("const x=1");
    let result: FormatResult | null = null;
    await act(async () => {
      result = await fn();
    });
    expect(spies.updateFile).toHaveBeenCalledWith("/a.js", "const x = 1;\n");
    expect(result).toMatchObject({ path: "/a.js", changed: true });
    expect(toastFns.success).toHaveBeenCalled();
  }, 30000);

  it("leaves formatted code alone", async () => {
    const fn = await mountWith("const x = 1;\n");
    let result: FormatResult | null = null;
    await act(async () => {
      result = await fn();
    });
    expect(spies.updateFile).not.toHaveBeenCalled();
    expect(result).toMatchObject({ changed: false });
  }, 30000);

  it("quiet mode suppresses toasts but still formats", async () => {
    const fn = await mountWith("const x=1");
    let result: FormatResult | null = null;
    await act(async () => {
      result = await fn({ quiet: true });
    });
    expect(result).toMatchObject({ changed: true });
    expect(spies.updateFile).toHaveBeenCalled();
    expect(toastFns.success).not.toHaveBeenCalled();
    expect(toastFns.error).not.toHaveBeenCalled();
    expect(toastFns.plain).not.toHaveBeenCalled();
  }, 30000);

  it("reports failure with an error toast on broken code", async () => {
    const fn = await mountWith("const = ");
    let result: FormatResult | null = null;
    await act(async () => {
      result = await fn();
    });
    expect(spies.updateFile).not.toHaveBeenCalled();
    expect(result).toMatchObject({ changed: false });
    expect(toastFns.error).toHaveBeenCalled();
  }, 30000);

  it("quiet mode suppresses even the failure toast", async () => {
    const fn = await mountWith("const = ");
    await act(async () => {
      await fn({ quiet: true });
    });
    expect(toastFns.error).not.toHaveBeenCalled();
  }, 30000);
});

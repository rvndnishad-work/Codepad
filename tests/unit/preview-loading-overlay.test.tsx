import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SandpackPreviewWithLoader } from "@/components/PreviewLoadingOverlay";

type Listener = (msg: unknown) => void;

const { state, mocks } = vi.hoisted(() => {
  const state: {
    status: string;
    error: { message: string } | null;
    listeners: Listener[];
  } = { status: "initial", error: null, listeners: [] };
  const mocks = {
    runSandpack: vi.fn(),
    dispatch: vi.fn(),
  };
  return { state, mocks };
});

vi.mock("@codesandbox/sandpack-react", () => ({
  SandpackPreview: () => <div data-testid="sandpack-preview" />,
  useSandpack: () => ({
    sandpack: {
      status: state.status,
      error: state.error,
      runSandpack: mocks.runSandpack,
    },
    listen: (fn: Listener) => {
      state.listeners.push(fn);
      return () => {
        state.listeners = state.listeners.filter((l) => l !== fn);
      };
    },
    dispatch: mocks.dispatch,
  }),
}));

function emit(msg: unknown) {
  act(() => {
    for (const l of [...state.listeners]) l(msg);
  });
}

beforeEach(() => {
  state.status = "initial";
  state.error = null;
  state.listeners = [];
  mocks.runSandpack.mockClear();
  mocks.dispatch.mockClear();
});

describe("SandpackPreviewWithLoader", () => {
  it("shows a loading state while the sandbox is starting", () => {
    render(<SandpackPreviewWithLoader title="React" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Preparing the React preview",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Starting sandbox…");
    expect(screen.getByTestId("sandpack-preview")).toBeTruthy();
  });

  it("switches the stage label while bundling", () => {
    const { rerender } = render(<SandpackPreviewWithLoader title="Vue" />);
    expect(screen.getByRole("status")).toHaveTextContent("Starting sandbox…");
    state.status = "running";
    rerender(<SandpackPreviewWithLoader title="Vue" />);
    expect(screen.getByRole("status")).toHaveTextContent("Bundling preview…");
  });

  it("dismisses on done and stays dismissed across recompiles (latched)", () => {
    const { rerender } = render(<SandpackPreviewWithLoader title="React" />);
    expect(screen.queryByRole("status")).toBeTruthy();

    state.status = "done";
    rerender(<SandpackPreviewWithLoader title="React" />);
    expect(screen.queryByRole("status")).toBeNull();

    // A later recompile must not flash the overlay back.
    state.status = "running";
    rerender(<SandpackPreviewWithLoader title="React" />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("dismisses on the bundler done message fast-path", () => {
    render(<SandpackPreviewWithLoader title="React" />);
    expect(screen.queryByRole("status")).toBeTruthy();
    emit({ type: "done" });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("yields to bundler errors so ErrorOverlay can show", () => {
    const { rerender } = render(<SandpackPreviewWithLoader title="React" />);
    expect(screen.queryByRole("status")).toBeTruthy();
    state.error = { message: "No transformer for /App.svelte" };
    rerender(<SandpackPreviewWithLoader title="React" />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows a retry state on timeout and retries on click", () => {
    state.status = "timeout";
    render(<SandpackPreviewWithLoader title="React" />);
    expect(screen.getByRole("status")).toHaveTextContent("Preview timed out");
    fireEvent.click(screen.getByRole("button", { name: /retry preview/i }));
    expect(mocks.runSandpack).toHaveBeenCalledTimes(1);
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "refresh" });
  });
});

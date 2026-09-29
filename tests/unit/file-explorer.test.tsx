import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import FileExplorer, { type ExplorerOps } from "@/components/FileExplorer";

type FileEntry = string | { code: string; hidden?: boolean };

const { store, spies, toastError, toastPlain } = vi.hoisted(() => {
  const store: { files: Record<string, FileEntry>; activeFile: string } = {
    files: {},
    activeFile: "/App.js",
  };
  const spies = {
    addFile: vi.fn(),
    deleteFile: vi.fn(),
    updateFile: vi.fn(),
    openFile: vi.fn(),
  };
  const toastError = vi.fn();
  const toastPlain = vi.fn();
  return { store, spies, toastError, toastPlain };
});

vi.mock("sonner", () => ({
  toast: Object.assign((...args: unknown[]) => toastPlain(...args), {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  }),
  Toaster: () => null,
}));

vi.mock("@codesandbox/sandpack-react", () => {
  const fakeSandpack = {
    get files() {
      return store.files;
    },
    get activeFile() {
      return store.activeFile;
    },
    addFile: (path: string, code: string) => {
      spies.addFile(path, code);
      // Immutable update like the real client: hooks memoize on reference.
      store.files = { ...store.files, [path]: { code } };
    },
    deleteFile: (path: string) => {
      spies.deleteFile(path);
      const next = { ...store.files };
      delete next[path];
      store.files = next;
    },
    updateFile: (payload: Record<string, FileEntry | string>) => {
      spies.updateFile(payload);
      const next = { ...store.files };
      for (const [path, value] of Object.entries(payload)) {
        const prev = next[path];
        const prevObj =
          typeof prev === "string" ? { code: prev } : ((prev as object) ?? {});
        next[path] =
          typeof value === "string"
            ? { code: value }
            : { ...prevObj, ...value };
      }
      store.files = next;
    },
    openFile: (path: string) => {
      spies.openFile(path);
      store.activeFile = path;
    },
    closeFile: vi.fn(),
  };
  return { useSandpack: () => ({ sandpack: fakeSandpack }) };
});

function resetStore() {
  store.files = {
    "/App.js": { code: "export default function App() {}\n" },
    "/index.js": { code: "import App from './App';\n" },
    "/package.json": {
      code: '{"main": "/index.js", "dependencies": {}}',
    },
    "/styles.css": { code: "", hidden: true },
  };
  store.activeFile = "/App.js";
}

beforeEach(() => {
  resetStore();
  for (const s of Object.values(spies)) s.mockClear();
  toastError.mockClear();
  toastPlain.mockClear();
  // The do-not-ask preference persists in localStorage — isolate tests.
  window.localStorage.clear();
});

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
}

async function createViaToolbar(name: string) {
  fireEvent.click(screen.getByTitle("New file"));
  const input = await screen.findByPlaceholderText("name.js");
  fireEvent.change(input, { target: { value: name } });
  fireEvent.keyDown(input, { key: "Enter" });
  await flush();
}

/**
 * End-to-end file operations through the real FileExplorer + useFileSystem
 * against a fake Sandpack client. These are the flows that broke in
 * production twice (dead "New File" row, phantom "already exists" toast) —
 * they must never regress silently again.
 */
describe("FileExplorer file operations", () => {
  it("creates a file from the toolbar with the default extension", async () => {
    render(<FileExplorer templateId="empty-react" />);
    expect(screen.getByText("App.js")).toBeInTheDocument();

    await createViaToolbar("Hello");

    expect(spies.addFile).toHaveBeenCalledWith(
      "/Hello.js",
      expect.stringContaining("New file"),
    );
    expect(await screen.findByText("Hello.js")).toBeInTheDocument();
    expect(spies.openFile).toHaveBeenCalledWith("/Hello.js");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("reveals hidden scaffolding instead of reporting a phantom duplicate", async () => {
    render(<FileExplorer templateId="empty-react" />);
    // styles.css exists but is hidden — invisible in the tree.
    expect(screen.queryByText("styles.css")).toBeNull();

    await createViaToolbar("styles.css");

    expect(spies.updateFile).toHaveBeenCalledWith({
      "/styles.css": expect.objectContaining({ hidden: false }),
    });
    expect(spies.addFile).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
    expect(await screen.findByText("styles.css")).toBeInTheDocument();
  });

  it("toasts on a genuinely visible duplicate and creates nothing", async () => {
    render(<FileExplorer templateId="empty-react" />);

    await createViaToolbar("App");

    expect(toastError).toHaveBeenCalledWith('"App.js" already exists');
    expect(spies.addFile).not.toHaveBeenCalled();
    expect(spies.updateFile).not.toHaveBeenCalled();
  });

  it("creates a folder from the toolbar", async () => {
    render(<FileExplorer templateId="empty-react" />);
    fireEvent.click(screen.getByTitle("New folder"));
    const input = await screen.findByPlaceholderText("folder name");
    fireEvent.change(input, { target: { value: "components" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await flush();

    expect(await screen.findByText("components")).toBeInTheDocument();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("creates nested files from a path-like name", async () => {
    render(<FileExplorer templateId="empty-react" />);
    await createViaToolbar("hooks/useTimer");

    expect(spies.addFile).toHaveBeenCalledWith(
      "/hooks/useTimer.js",
      expect.any(String),
    );
    expect(await screen.findByText("hooks")).toBeInTheDocument();
    expect(await screen.findByText("useTimer.js")).toBeInTheDocument();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("deletes a file through the context menu", async () => {
    render(<FileExplorer templateId="empty-react" />);
    fireEvent.contextMenu(screen.getByText("App.js"));
    fireEvent.click(await screen.findByText("Delete"));
    // Confirmation dialog names the file and warns it is permanent.
    await screen.findByText("Are you sure you want to delete 'App.js'?");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await flush();

    expect(spies.deleteFile).toHaveBeenCalledWith("/App.js");
    expect(screen.queryByText("App.js")).toBeNull();
  });

  it("cancels deletion from the dialog without side effects", async () => {
    render(<FileExplorer templateId="empty-react" />);
    fireEvent.contextMenu(screen.getByText("App.js"));
    fireEvent.click(await screen.findByText("Delete"));
    await screen.findByText("Are you sure you want to delete 'App.js'?");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await flush();

    expect(spies.deleteFile).not.toHaveBeenCalled();
    expect(screen.getByText("App.js")).toBeInTheDocument();
  });

  it("do-not-ask skips the dialog for later deletes", async () => {
    render(<FileExplorer templateId="empty-react" />);
    fireEvent.contextMenu(screen.getByText("App.js"));
    fireEvent.click(await screen.findByText("Delete"));
    await screen.findByText("Are you sure you want to delete 'App.js'?");
    fireEvent.click(screen.getByLabelText(/Do not ask me again/));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await flush();
    expect(spies.deleteFile).toHaveBeenCalledWith("/App.js");

    // Second delete goes straight through with no dialog.
    fireEvent.contextMenu(screen.getByText("index.js"));
    fireEvent.click(await screen.findByText("Delete"));
    await flush();
    expect(
      screen.queryByText(/Are you sure you want to delete/),
    ).toBeNull();
    expect(spies.deleteFile).toHaveBeenCalledWith("/index.js");
  });

  it("cancels creation on Escape without side effects", async () => {
    render(<FileExplorer templateId="empty-react" />);
    fireEvent.click(screen.getByTitle("New file"));
    const input = await screen.findByPlaceholderText("name.js");
    fireEvent.change(input, { target: { value: "Nope" } });
    fireEvent.keyDown(input, { key: "Escape" });
    await flush();

    expect(spies.addFile).not.toHaveBeenCalled();
    expect(screen.queryByText("Nope.js")).toBeNull();
  });
});

describe("FileExplorer keyboard ops", () => {
  function renderWithOps() {
    const opsRef: { current: ExplorerOps | null } = { current: null };
    render(<FileExplorer templateId="empty-react" opsRef={opsRef} />);
    if (!opsRef.current) throw new Error("opsRef never published");
    return opsRef.current;
  }

  it("renames the active file (F2 path)", async () => {
    const ops = renderWithOps();
    act(() => {
      ops.renameActiveFile();
    });
    const input = await screen.findByDisplayValue("App.js");
    fireEvent.change(input, { target: { value: "Main.js" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await flush();

    expect(await screen.findByText("Main.js")).toBeInTheDocument();
    expect(screen.queryByText("App.js")).toBeNull();
    expect(spies.openFile).toHaveBeenCalledWith("/Main.js");
  });

  it("deletes the active file (Del path)", async () => {
    const ops = renderWithOps();
    act(() => {
      ops.deleteActiveFile();
    });
    await screen.findByText("Are you sure you want to delete 'App.js'?");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await flush();

    expect(spies.deleteFile).toHaveBeenCalledWith("/App.js");
    expect(screen.queryByText("App.js")).toBeNull();
  });

  it("refuses to delete the last visible file", async () => {
    store.files = { "/only.js": { code: "x" } };
    store.activeFile = "/only.js";
    const ops = renderWithOps();

    act(() => {
      ops.deleteActiveFile();
    });
    await flush();

    expect(spies.deleteFile).not.toHaveBeenCalled();
    expect(toastPlain).toHaveBeenCalledWith("Cannot delete the last file");
    expect(screen.getByText("only.js")).toBeInTheDocument();
  });

  it("stays inert when read-only", async () => {
    const opsRef: { current: ExplorerOps | null } = { current: null };
    render(<FileExplorer templateId="empty-react" readOnly opsRef={opsRef} />);
    if (!opsRef.current) throw new Error("opsRef never published");

    act(() => {
      opsRef.current!.renameActiveFile();
      opsRef.current!.deleteActiveFile();
    });
    await flush();

    expect(spies.deleteFile).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue("App.js")).toBeNull();
  });
});

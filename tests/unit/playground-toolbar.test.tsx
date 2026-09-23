import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PlaygroundToolbar from "@/components/PlaygroundToolbar";
import {
  PlaygroundProvider,
  type PlaygroundContextValue,
} from "@/components/playground/PlaygroundContext";

type Overrides = Partial<Omit<PlaygroundContextValue, "doc" | "prefs">> & {
  doc?: Partial<PlaygroundContextValue["doc"]>;
  prefs?: Partial<PlaygroundContextValue["prefs"]>;
};

function makeCtx(o: Overrides = {}): PlaygroundContextValue {
  const { doc, prefs, ...rest } = o;
  return {
    templateId: "empty-react",
    templateTitle: "Empty React",
    templateMode: "browser",
    isBackend: false,
    signedIn: true,
    editable: true,
    snippet: null,
    backHref: undefined,
    isMobile: false,
    running: false,
    run: vi.fn(),
    view: "preview",
    setView: vi.fn(),
    toggleFiles: vi.fn(),
    togglePrompt: vi.fn(),
    copyCodeLink: vi.fn(),
    openShortcuts: vi.fn(),
    ...rest,
    doc: {
      title: "Untitled",
      setTitle: vi.fn(),
      visibility: "private",
      setVisibility: vi.fn(),
      saving: false,
      forking: false,
      snippetId: null,
      currentSlug: null,
      dirty: false,
      setDirty: vi.fn(),
      handleSave: vi.fn(async () => {}),
      handleSaveRef: { current: vi.fn(async () => {}) },
      handleFork: vi.fn(async () => {}),
      handleShare: vi.fn(async () => {}),
      handlePopout: vi.fn(),
      handleCopyEmbed: vi.fn(async () => {}),
      ...doc,
    } as PlaygroundContextValue["doc"],
    prefs: {
      fontSize: 14,
      setFontSize: vi.fn(),
      autoRun: true,
      setAutoRun: vi.fn(),
      formatOnSave: false,
      setFormatOnSave: vi.fn(),
      editorThemeId: "cobalt",
      setEditorThemeId: vi.fn(),
      ...prefs,
    } as PlaygroundContextValue["prefs"],
  };
}

function renderBar(o: Overrides = {}) {
  const ctx = makeCtx(o);
  render(
    <PlaygroundProvider value={ctx}>
      <PlaygroundToolbar />
    </PlaygroundProvider>,
  );
  return ctx;
}

function openMore() {
  fireEvent.click(screen.getByRole("button", { name: "More options" }));
  return screen.getByRole("dialog", { name: "More options" });
}

describe("PlaygroundToolbar", () => {
  it("renders the navbar brand lockup linking home", () => {
    renderBar();
    const brand = screen.getByRole("link", { name: "Interviewpad home" });
    expect(brand.getAttribute("href")).toBe("/");
    expect(brand.textContent).toContain("interview");
    expect(brand.textContent).not.toContain("Interview runtime");
  });

  it("Run is the one accent button and runs the code", () => {
    const ctx = renderBar();
    const run = screen.getByRole("button", { name: "Run" });
    expect(run.className).toContain("bg-accent");
    expect(run.title).toMatch(/Run \((⌘↵|Ctrl\+↵)\)/);
    fireEvent.click(run);
    expect(ctx.run).toHaveBeenCalledTimes(1);
  });

  it("Run shows a busy state while code runs", () => {
    renderBar({ running: true });
    const run = screen.getByRole("button", { name: "Running" });
    expect(run).toBeDisabled();
    expect(run.getAttribute("aria-busy")).toBe("true");
  });

  it("Exit is a quiet link back to /playgrounds", () => {
    renderBar();
    const exit = screen.getByRole("link", { name: "Exit to playgrounds" });
    expect(exit.getAttribute("href")).toBe("/playgrounds");
    expect(exit.className).not.toMatch(/red|danger/);
  });

  it("Exit asks before dropping unsaved changes", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderBar({ doc: { dirty: true } });
    const exit = screen.getByRole("link", { name: "Exit to playgrounds" });
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    exit.dispatchEvent(ev);
    expect(confirm).toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(true);
    confirm.mockRestore();
  });

  it("fresh playground offers Save even with no edits", () => {
    renderBar();
    const save = screen.getByRole("button", { name: /^save$/i });
    expect(save.dataset.state).toBe("dirty");
    expect(save.title).toContain("dashboard");
  });

  it("save settles to Saved only for persisted snippets", () => {
    renderBar({ doc: { snippetId: "abc123" } });
    expect(screen.getByRole("button", { name: /saved/i }).dataset.state).toBe("saved");
  });

  it("save shows a Saving state while persisting", () => {
    renderBar({ doc: { dirty: true, saving: true } });
    const save = screen.getByRole("button", { name: /saving/i });
    expect(save.dataset.state).toBe("saving");
    expect(save).toBeDisabled();
  });

  it("hides save for signed-out viewers", () => {
    renderBar({ signedIn: false, editable: false });
    expect(screen.queryByRole("button", { name: /^save/i })).toBeNull();
  });

  it("title edits mark the playground dirty", () => {
    const ctx = renderBar();
    fireEvent.change(screen.getByLabelText("Playground title"), { target: { value: "Mine" } });
    expect(ctx.doc.setTitle).toHaveBeenCalledWith("Mine");
    expect(ctx.doc.setDirty).toHaveBeenCalledWith(true);
  });

  it("view control switches between preview and split, with direction toggles", () => {
    const ctx = renderBar({ view: "both" });
    const group = screen.getByRole("radiogroup", { name: "Output view" });
    expect(within(group).getByRole("radio", { name: "Console" }).getAttribute("aria-checked")).toBe("true");
    const stacked = screen.getByTitle("Stacked: preview above console");
    expect(stacked.getAttribute("aria-pressed")).toBe("true");
    expect(stacked.parentElement?.getAttribute("data-open")).toBe("true");
    fireEvent.click(screen.getByTitle("Side by side"));
    expect(ctx.setView).toHaveBeenCalledWith("columns");
    fireEvent.click(within(group).getByRole("radio", { name: "Preview" }));
    expect(ctx.setView).toHaveBeenCalledWith("preview");
  });

  it("direction toggles stay mounted but parked when not split", () => {
    renderBar({ view: "preview" });
    const stacked = screen.getByTitle("Stacked: preview above console");
    expect(stacked.parentElement?.getAttribute("data-open")).toBe("false");
    expect(stacked.tabIndex).toBe(-1);
  });

  it("console-only templates have no view control", () => {
    renderBar({ templateMode: "console", view: "console" });
    expect(screen.queryByRole("radiogroup", { name: "Output view" })).toBeNull();
  });

  it("first save opens the naming dialog and saves the typed name", () => {
    const ctx = renderBar({ doc: { title: "My Draft", dirty: true } });
    fireEvent.click(screen.getByTitle(/save playground/i));
    const dialog = screen.getByRole("dialog", { name: "Save playground" });
    const input = within(dialog).getByLabelText("Playground name");
    expect(input).toHaveValue("My Draft");
    expect(ctx.doc.handleSave).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "  Final Name  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save playground" }));
    expect(ctx.doc.handleSave).toHaveBeenCalledWith({ title: "Final Name" });
    expect(screen.queryByRole("dialog", { name: "Save playground" })).toBeNull();
  });

  it("confirm stays disabled while the name is blank", () => {
    renderBar({ doc: { title: "My Draft" } });
    fireEvent.click(screen.getByTitle(/save playground/i));
    const dialog = screen.getByRole("dialog", { name: "Save playground" });
    fireEvent.change(within(dialog).getByLabelText("Playground name"), { target: { value: "   " } });
    expect(within(dialog).getByRole("button", { name: "Save playground" })).toBeDisabled();
  });

  it("escape closes the naming dialog without saving", () => {
    const ctx = renderBar();
    fireEvent.click(screen.getByTitle(/save playground/i));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Save playground" })).toBeNull();
    expect(ctx.doc.handleSave).not.toHaveBeenCalled();
  });

  it("re-save on an existing snippet bypasses the dialog", () => {
    const ctx = renderBar({ doc: { snippetId: "abc123", dirty: true } });
    fireEvent.click(screen.getByTitle(/save \(ctrl\+s\)/i));
    expect(ctx.doc.handleSave).toHaveBeenCalledWith();
    expect(screen.queryByRole("dialog", { name: "Save playground" })).toBeNull();
  });

  it("editor theme lives in the More menu until pinned", () => {
    const ctx = renderBar();
    expect(screen.queryByTitle("Editor theme")).toBeNull();
    const menu = openMore();
    expect(within(menu).queryByRole("option", { name: /dracula/i })).toBeNull();
    fireEvent.click(within(menu).getByRole("button", { name: /editor theme/i }));
    fireEvent.click(screen.getByRole("option", { name: /dracula/i }));
    expect(ctx.prefs.setEditorThemeId).toHaveBeenCalledWith("dracula");
  });

  it("pinning the theme puts the picker on the bar and persists", () => {
    const ctx = renderBar();
    const menu = openMore();
    fireEvent.click(within(menu).getByRole("button", { name: /editor theme/i }));
    fireEvent.click(screen.getByRole("button", { name: /^pin$/i }));
    expect(window.localStorage.getItem("play:tb:theme")).toBe("1");
    const picker = screen.getByTitle("Editor theme");
    fireEvent.click(picker);
    const listbox = screen.getAllByRole("listbox", { name: "Editor theme" }).at(-1)!;
    expect(within(listbox).getAllByRole("option")).toHaveLength(6);
    fireEvent.click(within(listbox).getByRole("option", { name: /monokai/i }));
    expect(ctx.prefs.setEditorThemeId).toHaveBeenCalledWith("monokai");
    window.localStorage.removeItem("play:tb:theme");
  });

  it("back returns from the theme subview to root options", () => {
    renderBar();
    const menu = openMore();
    fireEvent.click(within(menu).getByRole("button", { name: /editor theme/i }));
    expect(screen.getByRole("option", { name: /dracula/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /back to options/i }));
    expect(screen.queryByRole("option", { name: /dracula/i })).toBeNull();
  });

  it("menu toggles flip editor prefs", () => {
    const ctx = renderBar();
    const menu = openMore();
    fireEvent.click(within(menu).getByRole("button", { name: /format on save/i }));
    expect(ctx.prefs.setFormatOnSave).toHaveBeenCalledWith(true);
    fireEvent.click(within(menu).getByRole("button", { name: /auto-run/i }));
    expect(ctx.prefs.setAutoRun).toHaveBeenCalledWith(false);
    fireEvent.click(within(menu).getByRole("button", { name: "Larger font" }));
    expect(ctx.prefs.setFontSize).toHaveBeenCalledWith(15);
  });

  it("server-run templates have no auto-run or pop-out rows", () => {
    renderBar({ isBackend: true, templateMode: "console" });
    const menu = openMore();
    expect(within(menu).queryByRole("button", { name: /auto-run/i })).toBeNull();
    expect(within(menu).queryByRole("button", { name: /pop out preview/i })).toBeNull();
  });

  it("copy link with code needs no account", () => {
    const ctx = renderBar({ signedIn: false, editable: true });
    const menu = openMore();
    fireEvent.click(within(menu).getByRole("button", { name: "Copy link with code" }));
    expect(ctx.copyCodeLink).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "More options" })).toBeNull();
  });

  it("keyboard shortcuts open from the menu", () => {
    const ctx = renderBar();
    fireEvent.click(within(openMore()).getByRole("button", { name: /keyboard shortcuts/i }));
    expect(ctx.openShortcuts).toHaveBeenCalled();
  });

  it("signed-in menu shows the AI Assist toggle; signed-out gets a sign-in row", () => {
    renderBar();
    expect(within(openMore()).getByRole("button", { name: "AI Assist" })).toBeTruthy();
  });

  it("signed-out menu swaps the AI toggle for a sign-in row", () => {
    renderBar({ signedIn: false, editable: false });
    const menu = openMore();
    expect(within(menu).queryByRole("button", { name: "AI Assist" })).toBeNull();
    expect(within(menu).getByRole("link", { name: /AI Assist.*Sign in/i }).getAttribute("href")).toBe("/login");
  });

  it("pinned AI Assist shows only to signed-in users", () => {
    window.localStorage.setItem("play:tb:ai", "1");
    try {
      renderBar({ signedIn: false, editable: false });
      expect(screen.queryByTitle("AI Assist")).toBeNull();
    } finally {
      window.localStorage.removeItem("play:tb:ai");
    }
  });

  it("pinned timer can be started and reset", () => {
    window.localStorage.setItem("play:tb:timer", "1");
    try {
      renderBar();
      const timer = screen.getByRole("group", { name: "Challenge timer" });
      expect(timer.textContent).toContain("5:00");
      fireEvent.click(within(timer).getByRole("button", { name: "One minute more" }));
      expect(timer.textContent).toContain("6:00");
      fireEvent.click(within(timer).getByRole("button", { name: "Start timer" }));
      expect(within(timer).getByRole("button", { name: "Pause timer" })).toBeTruthy();
    } finally {
      window.localStorage.removeItem("play:tb:timer");
    }
  });

  describe("on phones", () => {
    it("keeps only brand, files, title, Run and More on the bar", () => {
      renderBar({ isMobile: true, doc: { dirty: true } });
      expect(screen.getByRole("button", { name: "Files" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Run" })).toBeTruthy();
      expect(screen.queryByRole("radiogroup", { name: "Output view" })).toBeNull();
      expect(screen.queryByRole("button", { name: /^save$/i })).toBeNull();
      expect(screen.queryByRole("link", { name: "Exit to playgrounds" })).toBeNull();
    });

    it("moves view, save, AI and exit into the sheet", () => {
      const ctx = renderBar({ isMobile: true });
      const sheet = openMore();
      fireEvent.click(within(sheet).getByRole("radio", { name: "Preview and console" }));
      expect(ctx.setView).toHaveBeenCalledWith("both");
      const sheet2 = openMore();
      expect(within(sheet2).getByRole("button", { name: "Save playground" })).toBeTruthy();
      expect(within(sheet2).getByRole("button", { name: "Open AI assist" })).toBeTruthy();
      expect(within(sheet2).getByRole("link", { name: "Exit to playgrounds" })).toBeTruthy();
    });
  });
},
// Heavy toolbar module (lucide + timer + menus): the first test pays the
// transform cost, which exceeds the 5s default under full-suite load.
15000);

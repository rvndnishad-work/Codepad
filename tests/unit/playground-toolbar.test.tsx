import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PlaygroundToolbar from "@/components/PlaygroundToolbar";

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    templateId: "empty-react",
    tplTitle: "Empty React",
    title: "Untitled",
    setTitle: vi.fn(),
    setDirty: vi.fn(),
    dirty: false,
    saving: false,
    signedIn: true,
    isOwner: true,
    editable: true,
    fontSize: 14,
    setFontSize: vi.fn(),
    view: "preview",
    setView: vi.fn(),
    visibility: "private",
    setVisibility: vi.fn(),
    snippet: null,
    snippetId: null,
    forking: false,
    handleSave: vi.fn(),
    handleFork: vi.fn(),
    handleShare: vi.fn(),
    handleCopyEmbed: vi.fn(),
    handlePopout: vi.fn(),
    handleRun: vi.fn(),
    running: false,
    onTogglePrompt: vi.fn(),
    tplMode: "browser",
    showRun: false,
    showDirectionToggle: false,
    uiScale: 1,
    setUiScale: vi.fn(),
    backHref: undefined,
    onToggleFiles: undefined,
    autoRun: true,
    setAutoRun: vi.fn(),
    formatOnSave: false,
    setFormatOnSave: vi.fn(),
    ...overrides,
  };
}

describe("PlaygroundToolbar branding + actions", () => {
  it("renders the navbar brand lockup linking home", () => {
    render(<PlaygroundToolbar {...baseProps()} />);
    const brand = screen.getByRole("link", { name: "Interviewpad home" });
    expect(brand.getAttribute("href")).toBe("/");
    // Same LogoDynamic lockup as the homepage navbar, minus the
    // sub-caption (toolbar stays single-line).
    expect(brand.textContent).toContain("interview");
    expect(brand.textContent).not.toContain("Interview runtime");
  });

  it("renders Exit as a solid red action to /playgrounds", () => {
    render(<PlaygroundToolbar {...baseProps()} />);
    const exit = screen.getByRole("link", { name: "Exit to playgrounds" });
    expect(exit.getAttribute("href")).toBe("/playgrounds");
    expect(exit.className).toContain("tb-exit");
    expect(exit.textContent).toContain("Exit");
  });

  it("save shows dirty state with an unsaved indicator", () => {
    render(<PlaygroundToolbar {...baseProps({ dirty: true })} />);
    const save = screen.getByRole("button", { name: /save/i });
    expect(save.dataset.state).toBe("dirty");
    expect(save.textContent).toContain("Save");
    // First save targets the dashboard — no Ctrl+S hint (that key is
    // file-level only and never creates dashboard entries).
    expect(save.title).toContain("dashboard");
  });

  it("save settles to a Saved state only for persisted snippets", () => {
    render(
      <PlaygroundToolbar {...baseProps({ dirty: false, snippetId: "abc123" })} />,
    );
    const save = screen.getByRole("button", { name: /saved/i });
    expect(save.dataset.state).toBe("saved");
  });

  it("fresh playground offers Save even with no edits", () => {
    // Dashboard persistence, not file edits, drives the button: a new
    // playground must never read as "Saved".
    render(<PlaygroundToolbar {...baseProps({ dirty: false })} />);
    const save = screen.getByRole("button", { name: /^save$/i });
    expect(save.dataset.state).toBe("dirty");
    expect(save.textContent).toContain("Save");
    expect(save.textContent).not.toContain("Saved");
  });

  it("save shows a Saving state while persisting", () => {
    render(<PlaygroundToolbar {...baseProps({ dirty: true, saving: true })} />);
    const save = screen.getByRole("button", { name: /saving/i });
    expect(save.dataset.state).toBe("saving");
    expect(save).toBeDisabled();
  });

  it("hides save for signed-out viewers", () => {
    render(
      <PlaygroundToolbar {...baseProps({ signedIn: false, editable: false })} />,
    );
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
  });

  it("view control carries per-tab identity with split direction toggles", () => {
    render(
      <PlaygroundToolbar
        {...baseProps({ view: "both", showDirectionToggle: true })}
      />,
    );
    const previewTab = screen.getByTitle("Preview only");
    const consoleTab = screen.getByTitle("Split: preview + console");
    expect(previewTab.dataset.kind).toBe("preview");
    expect(consoleTab.dataset.kind).toBe("console");
    expect(previewTab.dataset.active).toBe("false");
    expect(consoleTab.dataset.active).toBe("true");

    const stacked = screen.getByTitle("Stacked: preview above console");
    const sideBySide = screen.getByTitle("Side by side");
    expect(stacked.dataset.active).toBe("true");
    expect(sideBySide.dataset.active).toBe("false");
    // The direction slot is always mounted (fixed control width) and opens
    // in split mode so the track can slide in from the console side.
    expect(
      stacked.closest(".tb-dir-slot")?.getAttribute("data-open"),
    ).toBe("true");
  });

  it("direction slot stays mounted but parked when not split", () => {
    render(
      <PlaygroundToolbar
        {...baseProps({ view: "preview", showDirectionToggle: true })}
      />,
    );
    const stacked = screen.getByTitle("Stacked: preview above console");
    expect(
      stacked.closest(".tb-dir-slot")?.getAttribute("data-open"),
    ).toBe("false");
  });

  it("first save opens the naming dialog prefilled with the title", () => {
    const props = baseProps({ title: "My Draft", dirty: true });
    render(<PlaygroundToolbar {...props} />);
    fireEvent.click(screen.getByTitle(/save playground/i));
    const dialog = screen.getByRole("dialog", { name: "Save playground" });
    expect(
      within(dialog).getByLabelText("Playground name"),
    ).toHaveValue("My Draft");
    expect(props.handleSave).not.toHaveBeenCalled();
  });

  it("confirming the dialog saves with the typed name", () => {
    const props = baseProps({ title: "My Draft", dirty: true });
    render(<PlaygroundToolbar {...props} />);
    fireEvent.click(screen.getByTitle(/save playground/i));
    const dialog = screen.getByRole("dialog", { name: "Save playground" });
    fireEvent.change(within(dialog).getByLabelText("Playground name"), {
      target: { value: "  Final Name  " },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save playground" }),
    );
    expect(props.handleSave).toHaveBeenCalledTimes(1);
    expect(props.handleSave).toHaveBeenCalledWith({ title: "Final Name" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("re-save on an existing snippet bypasses the dialog", () => {
    const props = baseProps({ snippetId: "abc123", dirty: true });
    render(<PlaygroundToolbar {...props} />);
    fireEvent.click(screen.getByTitle(/save \(ctrl\+s\)/i));
    expect(props.handleSave).toHaveBeenCalledTimes(1);
    expect(props.handleSave).toHaveBeenCalledWith();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("escape closes the dialog without saving", () => {
    const props = baseProps({ dirty: true });
    render(<PlaygroundToolbar {...props} />);
    fireEvent.click(screen.getByTitle(/save playground/i));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(props.handleSave).not.toHaveBeenCalled();
  });

  it("theme picker switches the editor theme", () => {
    const setEditorThemeId = vi.fn();
    render(
      <PlaygroundToolbar
        {...baseProps({ editorThemeId: "cobalt", setEditorThemeId })}
      />,
    );
    expect(screen.getByTitle("Editor theme").textContent).toContain("Cobalt");
    fireEvent.click(screen.getByTitle("Editor theme"));
    const listbox = screen.getByRole("listbox", { name: "Editor theme" });
    expect(within(listbox).getAllByRole("option")).toHaveLength(6);
    fireEvent.click(within(listbox).getByRole("option", { name: /dracula/i }));
    expect(setEditorThemeId).toHaveBeenCalledWith("dracula");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("theme picker marks the active theme", () => {
    render(
      <PlaygroundToolbar
        {...baseProps({ editorThemeId: "monokai", setEditorThemeId: vi.fn() })}
      />,
    );
    fireEvent.click(screen.getByTitle("Editor theme"));
    expect(
      screen
        .getByRole("option", { name: /monokai/i })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("theme lives in a drill-in submenu, not the root menu", () => {
    window.localStorage.setItem("play:tb:theme", "0");
    try {
      const setEditorThemeId = vi.fn();
      render(
        <PlaygroundToolbar {...baseProps({ setEditorThemeId })} />,
      );
      // Gone from the bar…
      expect(screen.queryByTitle("Editor theme")).toBeNull();
      // …compact root menu: no options until drilling in.
      fireEvent.click(screen.getByTitle("More options"));
      expect(screen.queryByRole("option", { name: /dracula/i })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: /editor theme/i }));
      const option = screen.getByRole("option", { name: /dracula/i });
      fireEvent.click(option);
      expect(setEditorThemeId).toHaveBeenCalledWith("dracula");
    } finally {
      window.localStorage.removeItem("play:tb:theme");
    }
  });

  it("subview pin switch unpins the toolbar picker and persists", () => {
    const setEditorThemeId = vi.fn();
    render(<PlaygroundToolbar {...baseProps({ setEditorThemeId })} />);
    expect(screen.getByTitle("Editor theme")).toBeTruthy();
    fireEvent.click(screen.getByTitle("More options"));
    fireEvent.click(screen.getByRole("button", { name: /editor theme/i }));
    fireEvent.click(screen.getByRole("button", { name: /pinned/i }));
    expect(screen.queryByTitle("Editor theme")).toBeNull();
    expect(window.localStorage.getItem("play:tb:theme")).toBe("0");
    window.localStorage.removeItem("play:tb:theme");
  });

  it("back returns from the theme subview to root options", () => {
    render(
      <PlaygroundToolbar {...baseProps({ setEditorThemeId: vi.fn() })} />,
    );
    fireEvent.click(screen.getByTitle("More options"));
    fireEvent.click(screen.getByRole("button", { name: /editor theme/i }));
    expect(screen.getByRole("option", { name: /dracula/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /back to options/i }));
    expect(screen.queryByRole("option", { name: /dracula/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: /editor theme/i }),
    ).toBeTruthy();
  });

  it("confirm stays disabled while the name is blank", () => {
    const props = baseProps({ title: "  ", dirty: true });
    render(<PlaygroundToolbar {...props} />);
    fireEvent.click(screen.getByTitle(/save playground/i));
    const dialog = screen.getByRole("dialog", { name: "Save playground" });
    fireEvent.change(within(dialog).getByLabelText("Playground name"), {
      target: { value: "   " },
    });
    expect(
      within(dialog).getByRole("button", { name: "Save playground" }),
    ).toBeDisabled();
    expect(props.handleSave).not.toHaveBeenCalled();
  });

  it("signed-in menu shows the AI Assist toggle", () => {
    render(<PlaygroundToolbar {...baseProps()} />);
    fireEvent.click(screen.getByTitle("More options"));
    expect(
      screen.getByRole("button", { name: "AI Assist" }),
    ).toBeTruthy();
  });

  it("signed-out menu swaps the AI toggle for a sign-in row", () => {
    render(
      <PlaygroundToolbar {...baseProps({ signedIn: false, editable: false })} />,
    );
    fireEvent.click(screen.getByTitle("More options"));
    expect(screen.queryByRole("button", { name: "AI Assist" })).toBeNull();
    const login = screen.getByRole("link", { name: /AI Assist.*Sign in/i });
    expect(login.getAttribute("href")).toBe("/login");
  });

  it("hides the pinned AI Assist button from signed-out users", () => {
    window.localStorage.setItem("play:tb:ai", "1");
    try {
      render(
        <PlaygroundToolbar {...baseProps({ signedIn: false, editable: false })} />,
      );
      // Bar button (title="AI Assist") is login-only; the menu login row is
      // a link, not a button, so no button matches.
      expect(screen.queryByTitle("AI Assist")).toBeNull();
    } finally {
      window.localStorage.removeItem("play:tb:ai");
    }
  });

  it("shows the pinned AI Assist button to signed-in users", () => {
    window.localStorage.setItem("play:tb:ai", "1");
    try {
      render(<PlaygroundToolbar {...baseProps()} />);
      expect(screen.getByTitle("AI Assist").textContent).toContain("AI Assist");
    } finally {
      window.localStorage.removeItem("play:tb:ai");
    }
  });
},
// Heavy toolbar module (lucide + timer + menus): the first test pays the
// transform cost, which exceeds the 5s default under full-suite load.
15000);

/**
 * Starting sizes for the playground panes, as pure math so every viewport
 * and view can be checked in a unit test.
 *
 * The rules:
 * - The output pane never gets squeezed below what its view needs: one
 *   panel needs 360px, preview and console side by side need 600px.
 * - The editor gives way first (down to 280px); a width the user dragged
 *   to is kept as a preference and comes back when there is room again.
 * - Preview and console share the output pane by percentage, so switching
 *   views or resizing the window can never collapse either of them.
 * - Below 1100px wide the file explorer starts collapsed so the editor and
 *   output keep usable widths on tablets and small laptops.
 */

export type OutputView = "preview" | "console" | "both" | "columns";

export const PANE = {
  editorMin: 280,
  outputMin: 360,
  outputMinColumns: 640,
  explorerDefault: 280,
  explorerMin: 200,
  explorerMax: 400,
  explorerRail: 40,
  promptDefault: 384,
  promptMin: 280,
  promptMax: 640,
  divider: 1,
  /** Viewports narrower than this start with the explorer collapsed. */
  collapseExplorerBelow: 1100,
} as const;

/** Console share of the output pane, in percent. */
export const CONSOLE_SPLIT = {
  columns: { initial: 40, min: 30, max: 70 },
  rows: { initial: 40, min: 20, max: 80 },
} as const;

/**
 * Phone stacking, in percent of the height: the editor's share (less when
 * preview and console both need room) and the preview's share of the rest.
 */
export const PHONE_SPLIT = {
  editor: { single: 55, split: 40 },
  preview: 55,
} as const;

export function phoneEditorSplit(view: OutputView): number {
  return view === "both" || view === "columns" ? PHONE_SPLIT.editor.split : PHONE_SPLIT.editor.single;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Width the output pane needs for a view. */
export function outputMinWidth(view: OutputView, isBackend: boolean): number {
  return !isBackend && view === "columns" ? PANE.outputMinColumns : PANE.outputMin;
}

/** Width taken left of the editor: docked AI panel, explorer (or its rail), dividers. */
export function leftOfEditor({
  explorerCollapsed,
  explorerWidth,
  promptOpen,
  promptWidth,
}: {
  explorerCollapsed: boolean;
  explorerWidth: number;
  promptOpen: boolean;
  promptWidth: number;
}): number {
  const explorer = explorerCollapsed ? PANE.explorerRail : explorerWidth + PANE.divider;
  const prompt = promptOpen ? promptWidth + PANE.divider : 0;
  return explorer + prompt;
}

/** How wide the editor may be so the output keeps what its view needs. */
export function editorMaxWidth(viewport: number, left: number, view: OutputView, isBackend: boolean): number {
  return Math.max(PANE.editorMin, viewport - left - PANE.divider - outputMinWidth(view, isBackend));
}

/**
 * Side by side needs room for both panels next to a usable editor. Where
 * there is not enough (narrow tablets), the columns view stacks instead.
 */
export function columnsFit(viewport: number, left: number): boolean {
  return viewport - left - PANE.divider - PANE.editorMin >= PANE.outputMinColumns;
}

/** The view actually laid out, after the phone and narrow-width fallbacks. */
export function effectiveView(
  view: OutputView,
  { isBackend, isMobile, viewport, left }: { isBackend: boolean; isMobile: boolean; viewport: number; left: number },
): OutputView {
  if (isBackend) return "console";
  if (view === "columns" && (isMobile || !columnsFit(viewport, left))) return "both";
  return view;
}

/** First-visit editor width: half of what is left after the explorer. */
export function defaultEditorWidth(viewport: number, left: number): number {
  return Math.max(PANE.editorMin, Math.floor((viewport - left) * 0.5));
}

/**
 * Docking the AI panel next to an open explorer can leave too little room
 * for a usable editor and output; the explorer then tucks away while the
 * panel is open.
 */
export function explorerCrowdsPrompt(viewport: number, explorerWidth: number, promptWidth: number): boolean {
  const left = leftOfEditor({ explorerCollapsed: false, explorerWidth, promptOpen: true, promptWidth });
  return viewport - left - PANE.divider - PANE.editorMin < PANE.outputMin;
}

export function startsWithExplorerCollapsed(viewport: number): boolean {
  return viewport < PANE.collapseExplorerBelow;
}

/**
 * The pixel widths the desktop row lays out to, for tests and for the
 * screenshot checks: explorer, editor, output, and the preview and console
 * split inside the output.
 */
export function resolveDesktopLayout({
  viewport,
  view,
  isBackend = false,
  explorerCollapsed,
  explorerWidth = PANE.explorerDefault,
  promptOpen = false,
  promptWidth = PANE.promptDefault,
  editorPreferred,
  consoleSplit,
}: {
  viewport: number;
  view: OutputView;
  isBackend?: boolean;
  explorerCollapsed: boolean;
  explorerWidth?: number;
  promptOpen?: boolean;
  promptWidth?: number;
  editorPreferred?: number;
  consoleSplit?: number;
}) {
  const left = leftOfEditor({ explorerCollapsed, explorerWidth, promptOpen, promptWidth });
  view = effectiveView(view, { isBackend, isMobile: false, viewport, left });
  const preferred = editorPreferred ?? defaultEditorWidth(viewport, left);
  const editor = clamp(preferred, PANE.editorMin, editorMaxWidth(viewport, left, view, isBackend));
  const output = viewport - left - PANE.divider - editor;
  const mode = view;
  let preview = mode === "console" ? 0 : output;
  let consolePane = mode === "preview" ? 0 : output;
  if (mode === "columns") {
    const s = CONSOLE_SPLIT.columns;
    consolePane = Math.round((output * clamp(consoleSplit ?? s.initial, s.min, s.max)) / 100);
    preview = output - consolePane - PANE.divider;
  }
  return { view: mode, left, editor, output, preview, console: consolePane };
}

"use client";

/**
 * Shared Excalidraw board. Elements live in a Y.Map keyed by element id;
 * the merge rules are in src/lib/interview/whiteboard.ts.
 *
 * People look at the board on different screens, so a shape drawn on a
 * laptop can land off a phone's screen. The view follows: when remote
 * changes land off screen, it moves to show them, unless this person has
 * touched the board in the last few seconds. On open, the whole board is
 * fitted to the screen (zooming out, never in past 100%), and "Show
 * everything" does the same on demand.
 */
import "@excalidraw/excalidraw/index.css";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { CaptureUpdateAction, Excalidraw, Footer, MainMenu, getCommonBounds } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { Scan } from "lucide-react";
import { FIT_PADDING, byIndex, followDelay, followTarget, mergeRemote, newer, shouldFollow, union, viewportBox, type Box, type WbEl } from "@/lib/interview/whiteboard";

type El = WbEl;
type Api = ExcalidrawImperativeAPI;

// Fonts are copied to /public/excalidraw on install (scripts/copy-excalidraw.mjs).
if (typeof window !== "undefined") {
  (window as unknown as { EXCALIDRAW_ASSET_PATH?: string }).EXCALIDRAW_ASSET_PATH = "/excalidraw/";
}

function boxOf(e: El): Box {
  return getCommonBounds([e as never]) as unknown as Box;
}

function live(api: Api): El[] {
  return api.getSceneElements() as unknown as El[];
}

/** Fits the whole board on screen, zooming out as needed and never in past maxZoom. */
function fitAll(api: Api, { animate, maxZoom = 1 }: { animate: boolean; maxZoom?: number }) {
  const els = live(api);
  const s = api.getAppState();
  if (!els.length || !s.width || !s.height) return;
  api.scrollToContent(els as never, { fitToViewport: true, viewportZoomFactor: FIT_PADDING, maxZoom, animate, duration: 300 });
}

/**
 * `caption` is set in the interview room, which drops its header above the
 * board: the title and caption then sit in the board footer (desktop), and
 * phones get the whole height.
 */
export default function Whiteboard({ doc, awareness, dark, readOnly, caption }: { doc: Y.Doc; awareness: Awareness | null; dark: boolean; readOnly: boolean; caption?: string }) {
  const ymap = useMemo(() => doc.getMap<El>("whiteboard"), [doc]);
  const api = useRef<Api | null>(null);
  /** Excalidraw has loaded initialData; before that, updateScene would be overwritten. */
  const ready = useRef(false);
  const lastLocal = useRef(0);
  const pending = useRef<{ ids: Set<string>; firstAt: number; timer: ReturnType<typeof setTimeout> | null }>({ ids: new Set(), firstAt: 0, timer: null });
  const reduceMotion = useRef(false);

  const initial = useMemo(
    () => ({
      elements: [...ymap.values()].sort(byIndex) as never,
      // Transparent so the stage surface token shows through in both themes.
      appState: { viewBackgroundColor: "transparent" },
      scrollToContent: true,
    }),
    // Only the first render counts; later changes arrive through updateScene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    reduceMotion.current = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const touched = useCallback(() => {
    lastLocal.current = Date.now();
  }, []);

  /** Moves the view to the remote changes gathered so far, if they are off screen. */
  const follow = useCallback(() => {
    const p = pending.current;
    const ids = [...p.ids];
    p.ids.clear();
    p.timer = null;
    const a = api.current;
    if (!a || !ids.length) return;
    const s = a.getAppState();
    if (!s.width || !s.height) return;
    const els = live(a);
    const changedEls = els.filter((e) => ids.includes(e.id));
    const changed = changedEls.map(boxOf);
    if (!shouldFollow({ changed, view: viewportBox(s), now: Date.now(), lastLocalAt: lastLocal.current })) return;
    const all = union(els.map(boxOf));
    if (!all) return;
    const t = followTarget({ all, width: s.width, height: s.height, zoom: s.zoom.value });
    a.scrollToContent((t.target === "all" ? els : changedEls) as never, {
      fitToViewport: true,
      viewportZoomFactor: FIT_PADDING,
      maxZoom: t.maxZoom,
      animate: !reduceMotion.current,
      duration: 350,
    });
  }, []);

  const queueFollow = useCallback(
    (ids: string[]) => {
      const p = pending.current;
      const now = Date.now();
      if (!p.ids.size) p.firstAt = now;
      ids.forEach((id) => p.ids.add(id));
      if (p.timer) clearTimeout(p.timer);
      p.timer = setTimeout(follow, followDelay(p.firstAt, now));
    },
    [follow],
  );

  /** Pulls remote elements into the scene. With no keys, the whole map. */
  const pull = useCallback(
    (keys?: Iterable<string>): El[] => {
      const a = api.current;
      if (!a || !ready.current) return [];
      const remote: El[] = [];
      for (const k of keys ?? ymap.keys()) {
        const v = ymap.get(k);
        if (v) remote.push(v);
      }
      const merged = mergeRemote(a.getSceneElementsIncludingDeleted() as unknown as El[], remote);
      if (!merged) return [];
      a.updateScene({ elements: merged.elements as never, captureUpdate: CaptureUpdateAction.NEVER });
      return merged.changed;
    },
    [ymap],
  );

  // Remote changes into the scene. Anything that arrived before this
  // observer (or before Excalidraw finished loading) is picked up by the
  // full pull when the scene becomes ready.
  useEffect(() => {
    const onChange = (ev: Y.YMapEvent<El>, tr: Y.Transaction) => {
      if (tr.local) return;
      const changed = pull(ev.keysChanged);
      const shown = changed.filter((e) => !e.isDeleted).map((e) => e.id);
      if (shown.length) queueFollow(shown);
    };
    ymap.observe(onChange);
    pull();
    const p = pending.current;
    return () => {
      ymap.unobserve(onChange);
      if (p.timer) clearTimeout(p.timer);
      p.timer = null;
      p.ids.clear();
    };
  }, [ymap, pull, queueFollow]);

  // Other people's pointers, when the direct link is up.
  useEffect(() => {
    if (!awareness) return;
    const render = () => {
      if (!api.current) return;
      const collaborators = new Map();
      awareness.getStates().forEach((s, id) => {
        if (id === awareness.clientID || !s.pointer) return;
        collaborators.set(String(id), { pointer: s.pointer, username: s.user?.name, color: s.user?.color ? { background: s.user.color, stroke: s.user.color } : undefined });
      });
      api.current.updateScene({ collaborators, captureUpdate: CaptureUpdateAction.NEVER });
    };
    awareness.on("change", render);
    return () => awareness.off("change", render);
  }, [awareness]);

  // Excalidraw measures itself on window resizes only; the room also
  // resizes the stage when the call column or a panel opens or closes.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => api.current?.refresh());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const showAll = () => {
    if (api.current) fitAll(api.current, { animate: !reduceMotion.current });
  };

  return (
    // Capture-phase listeners only note that this person is using the
    // board; they never stop or prevent anything, so touch, pinch and
    // pen input reach Excalidraw untouched.
    // Hidden: the canvas hint ("To move canvas, hold mouse wheel...") repeats
    // what the hand tool shows and costs a line under the toolbar; the shape
    // Library button does not fit beside the toolbar on tablets (it was cut
    // off at the edge) and an interview board does not need it.
    <div ref={box} className="absolute inset-0 [&_.HintViewer]:!hidden [&_.sidebar-trigger]:!hidden" onPointerDownCapture={touched} onWheelCapture={touched} onKeyDownCapture={touched}>
      <Excalidraw
        excalidrawAPI={(a) => {
          api.current = a;
        }}
        initialData={initial}
        theme={dark ? "dark" : "light"}
        viewModeEnabled={readOnly}
        isCollaborating={!!awareness}
        UIOptions={{
          canvasActions: { loadScene: false, saveToActiveFile: false, export: false, toggleTheme: false, changeViewBackgroundColor: false, clearCanvas: true, saveAsImage: true },
          tools: { image: false },
        }}
        onPointerUpdate={
          awareness
            ? ({ pointer }) => {
                awareness.setLocalStateField("pointer", pointer);
              }
            : undefined
        }
        onChange={(elements) => {
          const a = api.current;
          if (!ready.current && a) {
            // First change after Excalidraw loaded initialData: catch up on
            // anything that changed since the first render, then show it all.
            ready.current = true;
            pull();
            fitAll(a, { animate: false });
          }
          const els = elements as unknown as El[];
          const changed = els.filter((e) => newer(e, ymap.get(e.id)));
          if (!changed.length) return;
          lastLocal.current = Date.now();
          doc.transact(() => {
            for (const e of changed) ymap.set(e.id, JSON.parse(JSON.stringify(e)));
          });
        }}
      >
        {/* "Show everything" lives in the menu on every screen (the only
            place phones have room for it) and in the footer on desktops. */}
        <MainMenu>
          <MainMenu.Item icon={<Scan className="w-4 h-4" aria-hidden />} onSelect={showAll}>
            Show everything
          </MainMenu.Item>
          <MainMenu.DefaultItems.SaveAsImage />
          {!readOnly && <MainMenu.DefaultItems.ClearCanvas />}
          <MainMenu.DefaultItems.Help />
        </MainMenu>
        <Footer>
          <div className="h-9 flex items-center gap-2.5 pl-3 min-w-0">
            {caption && (
              <span className="hidden lg:flex items-center gap-1.5 min-w-0 text-[12.5px] whitespace-nowrap">
                <span className="font-semibold text-fg">Whiteboard</span>
                <span className="text-muted truncate">{caption}</span>
              </span>
            )}
            <button
              type="button"
              onClick={showAll}
              title="Show everything"
              aria-label="Show everything on the board"
              className="h-9 px-2.5 rounded-lg bg-surface ring-1 ring-inset ring-border text-[12.5px] text-muted hover:text-fg hover:bg-panel inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Scan className="w-4 h-4" aria-hidden />
              <span className="hidden xl:inline">Show everything</span>
            </button>
          </div>
        </Footer>
      </Excalidraw>
    </div>
  );
}

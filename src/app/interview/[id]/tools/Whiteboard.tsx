"use client";

/**
 * Shared Excalidraw board. Elements live in a Y.Map keyed by element id;
 * the higher version wins, ties go to the lower versionNonce (the same rule
 * Excalidraw uses to reconcile), so both sides settle on one scene.
 */
import "@excalidraw/excalidraw/index.css";
import { useEffect, useMemo, useRef } from "react";
import { CaptureUpdateAction, Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";

type El = { id: string; version: number; versionNonce: number; index?: string | null; isDeleted?: boolean };

// Fonts are copied to /public/excalidraw on install (scripts/copy-excalidraw.mjs).
if (typeof window !== "undefined") {
  (window as unknown as { EXCALIDRAW_ASSET_PATH?: string }).EXCALIDRAW_ASSET_PATH = "/excalidraw/";
}

function newer(a: El, b: El | undefined): boolean {
  if (!b) return true;
  if (a.version !== b.version) return a.version > b.version;
  return a.versionNonce < b.versionNonce && a.versionNonce !== b.versionNonce;
}

function byIndex(a: El, b: El): number {
  const x = a.index ?? "";
  const y = b.index ?? "";
  return x < y ? -1 : x > y ? 1 : 0;
}

export default function Whiteboard({ doc, awareness, dark, readOnly }: { doc: Y.Doc; awareness: Awareness | null; dark: boolean; readOnly: boolean }) {
  const ymap = useMemo(() => doc.getMap<El>("whiteboard"), [doc]);
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
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

  // Remote changes into the scene.
  useEffect(() => {
    const onChange = (ev: Y.YMapEvent<El>, tr: Y.Transaction) => {
      if (tr.local || !api.current) return;
      const local = api.current.getSceneElementsIncludingDeleted() as unknown as El[];
      const byId = new Map(local.map((e) => [e.id, e]));
      let changed = false;
      for (const key of ev.keysChanged) {
        const remote = ymap.get(key);
        if (remote && newer(remote, byId.get(key))) {
          byId.set(key, remote);
          changed = true;
        }
      }
      if (changed) api.current.updateScene({ elements: [...byId.values()].sort(byIndex) as never, captureUpdate: CaptureUpdateAction.NEVER });
    };
    ymap.observe(onChange);
    return () => ymap.unobserve(onChange);
  }, [ymap]);

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

  return (
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
        const els = elements as unknown as El[];
        const changed = els.filter((e) => newer(e, ymap.get(e.id)));
        if (!changed.length) return;
        doc.transact(() => {
          for (const e of changed) ymap.set(e.id, JSON.parse(JSON.stringify(e)));
        });
      }}
    />
  );
}

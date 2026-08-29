/* eslint-disable react-hooks/immutability */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Palette,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Undo2,
  Redo2,
  Save,
  ExternalLink,
  Sparkles,
  BookOpen,
  HelpCircle,
  Briefcase,
  Braces,
  Code2,
  FileText,
  User,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { updateSpaceBlocksAction, publishSpaceBlocksAction } from "../../actions";
import type { Block, SpaceBlocksDoc } from "@/lib/creator/blocks";
import { BLOCK_TYPES } from "@/lib/creator/blocks";
import { SECTION_KEYS, SECTION_LABELS, type SectionKey } from "@/lib/creator/layout";
import type { TokenSet } from "@/lib/creator/tokens";
import { TOKEN_PRESETS } from "@/lib/creator/tokens";
import TokenPicker from "@/components/creator/TokenPicker";
import Link from "next/link";

const BLOCK_ICON: Record<string, LucideIcon> = {
  ABOUT: User,
  MEMBERSHIP: Sparkles,
  TUTORIAL: BookOpen,
  INTERVIEW_QA: HelpCircle,
  INTERVIEW_EXPERIENCE: Briefcase,
  CHALLENGE: Braces,
  SNIPPET: Code2,
  BLOG_POST: FileText,
  HERO: Megaphone,
  CTA: Sparkles,
  GALLERY: FileText,
  FAQ: HelpCircle,
  TESTIMONIAL: User,
  NEWSLETTER: Megaphone,
  EMBED: Code2,
};

type Props = {
  spaceId: string;
  handle: string;
  name: string;
  tagline: string | null;
  blocksDoc: SpaceBlocksDoc;
  tokenSet: TokenSet | null;
  counts: Record<SectionKey, number>;
  tiers: { id: string; name: string; rank: number }[];
};

const HISTORY_LIMIT = 50;

function cloneDoc(doc: SpaceBlocksDoc): SpaceBlocksDoc {
  return {
    hero: { ...doc.hero },
    blocks: doc.blocks.map((b) => ({ ...b, props: { ...b.props } })),
  };
}

export default function DesignClient(props: Props) {
  const router = useRouter();
  const [doc, setDoc] = useState<SpaceBlocksDoc>(() => cloneDoc(props.blocksDoc));
  const [tokens, setTokens] = useState<TokenSet | null>(props.tokenSet);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [busy, setBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [historyLen, setHistoryLen] = useState(0);
  const [futureLen, setFutureLen] = useState(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // history
  const historyRef = useRef<SpaceBlocksDoc[]>([]);
  const futureRef = useRef<SpaceBlocksDoc[]>([]);

  const syncHistoryLens = useCallback(() => {
    setHistoryLen(historyRef.current.length);
    setFutureLen(futureRef.current.length);
  }, []);

  const pushHistory = useCallback((prev: SpaceBlocksDoc) => {
    historyRef.current.push(cloneDoc(prev));
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    futureRef.current = [];
    syncHistoryLens();
  }, [syncHistoryLens]);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push(cloneDoc(doc));
    setDoc(prev);
    syncHistoryLens();
  }, [doc, syncHistoryLens]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(cloneDoc(doc));
    setDoc(next);
    syncHistoryLens();
  }, [doc, syncHistoryLens]);

  const saveRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    saveRef.current = save;
  });

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // autosave 1.2s
  const saveTimer = useRef<number | null>(null);
  const pendingRef = useRef<SpaceBlocksDoc | null>(null);

  const scheduleAutosave = useCallback(
    (nextDoc: SpaceBlocksDoc, nextTokens: TokenSet | null) => {
      pendingRef.current = nextDoc;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        const toSave = pendingRef.current;
        if (!toSave) return;
        try {
          await updateSpaceBlocksAction(props.spaceId, toSave, nextTokens);
          toast.success("Autosaved", { duration: 1200 });
        } catch (err) {
          toast.error("Autosave failed", { description: err instanceof Error ? err.message : String(err) });
        }
      }, 1200) as unknown as number;
    },
    [props.spaceId]
  );

  const updateDoc = useCallback(
    (updater: (prev: SpaceBlocksDoc) => SpaceBlocksDoc) => {
      setDoc((prev) => {
        const next = updater(cloneDoc(prev));
        pushHistory(prev);
        scheduleAutosave(next, tokens);
        return next;
      });
    },
    [pushHistory, scheduleAutosave, tokens]
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    updateDoc((prev) => {
      const from = prev.blocks.findIndex((b) => b.id === active.id);
      const to = prev.blocks.findIndex((b) => b.id === over.id);
      if (from < 0 || to < 0) return prev;
      return { ...prev, blocks: arrayMove(prev.blocks, from, to) };
    });
  };

  const toggleVisible = (id: string) =>
    updateDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)),
    }));

  const changeCols = (id: string, cols: number) =>
    updateDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, cols } : b)),
    }));

  const changeTierGate = (id: string, rankStr: string) =>
    updateDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, tierGate: rankStr === "" ? null : parseInt(rankStr, 10) } : b)),
    }));

  const addBlock = (type: (typeof BLOCK_TYPES)[number]) =>
    updateDoc((prev) => ({
      ...prev,
      blocks: [
        ...prev.blocks,
        {
          id: `blk_${type.toLowerCase()}_${Date.now().toString(36)}`,
          type,
          props: {},
          cols: 12,
          visible: true,
          tierGate: null,
        },
      ],
    }));

  const removeBlock = (id: string) =>
    updateDoc((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== id) }));

  const changeTokens = (next: TokenSet) => {
    setTokens(next);
    scheduleAutosave(doc, next);
  };

  const save = async () => {
    setBusy(true);
    try {
      await updateSpaceBlocksAction(props.spaceId, doc, tokens);
      toast.success("Design saved");
      router.refresh();
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setPublishBusy(true);
    try {
      await publishSpaceBlocksAction(props.spaceId, doc, tokens);
      toast.success("Published — /c/" + props.handle + " updated");
      router.refresh();
    } catch (err) {
      toast.error("Publish failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setPublishBusy(false);
    }
  };

  const selected = useMemo(() => doc.blocks.find((b) => b.id === selectedId) ?? null, [doc.blocks, selectedId]);

  const deviceCls = device === "mobile" ? "max-w-[390px]" : device === "tablet" ? "max-w-[768px]" : "max-w-[1024px]";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-fg">Design</h1>
            <p className="text-xs text-muted mt-0.5">
              Palette, canvas, inspector — drag blocks, gate by tier, autosaves in 1.2s. <span className="hidden md:inline">⌘Z/⇧⌘Z undo/redo, ⌘S save.</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyLen === 0}
            className="w-8 h-8 rounded-lg border border-border bg-surface grid place-items-center text-muted hover:text-fg disabled:opacity-40"
            title="Undo (⌘Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={futureLen === 0}
            className="w-8 h-8 rounded-lg border border-border bg-surface grid place-items-center text-muted hover:text-fg disabled:opacity-40"
            title="Redo (⇧⌘Z)"
            aria-label="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <Link
            href={`/c/${props.handle}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-muted hover:text-fg"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Preview
          </Link>
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-panel border border-border text-xs font-bold text-fg hover:border-accent/30 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={publish}
            disabled={publishBusy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" /> {publishBusy ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Palette */}
        <div className="lg:col-span-3 space-y-4">
          <section className="rounded-2xl border border-border bg-surface shadow-tile p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Add block
            </h2>
            <p className="text-[11px] text-muted mt-1">Tap to append; drag to reorder in the list below.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["HERO", "CTA", "GALLERY", "FAQ", "TESTIMONIAL", "NEWSLETTER", "EMBED"] as const).map((t) => {
                const Icon = BLOCK_ICON[t] ?? FileText;
                return (
                  <button
                    key={t}
                    onClick={() => addBlock(t)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border bg-bg hover:border-accent/30 text-xs font-semibold text-fg"
                  >
                    <Icon className="w-3.5 h-3.5 text-accent" /> {t}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface shadow-tile p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" /> Theme
            </h2>
            <div className="mt-3">
              <TokenPicker value={tokens} onChange={changeTokens} />
              <p className="text-[10px] text-muted mt-2">
                Preset stored in <code className="px-1 py-0.5 rounded bg-panel border border-border text-[10px]">styles</code>. Public page
                injects vars via <code className="px-1 py-0.5 rounded bg-panel border border-border text-[10px]">tokenSetToCssVars</code>.
              </p>
              <div className="mt-3 flex gap-2">
                {(["slate", "glassmorphism", "neon", "minimalist"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => changeTokens(TOKEN_PRESETS[k])}
                    className="text-[10px] px-2 py-1 rounded-full border border-border bg-bg hover:border-accent/30"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface shadow-tile p-4">
            <h2 className="text-sm font-bold text-fg flex items-center gap-2">
              <Eye className="w-4 h-4 text-accent" /> Blocks
            </h2>
            <p className="text-[11px] text-muted mt-0.5">Drag to reorder. Selected shows in inspector.</p>
            <div className="mt-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={doc.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {doc.blocks.map((b) => (
                      <SortableBlockRow
                        key={b.id}
                        block={b}
                        count={props.counts[b.type as SectionKey] ?? 0}
                        selected={selectedId === b.id}
                        onSelect={() => setSelectedId(b.id)}
                        onToggle={() => toggleVisible(b.id)}
                        onRemove={() => removeBlock(b.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </section>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-6">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
              {(["desktop", "tablet", "mobile"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold capitalize ${device === d ? "bg-accent text-bg" : "text-muted hover:text-fg"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-muted">Autosaves in 1.2s · {doc.blocks.length} blocks</span>
          </div>
          <div className={`mx-auto rounded-2xl border border-border bg-surface overflow-hidden shadow-tile transition-all ${deviceCls}`}>
            {/* Hero preview */}
            <div className="p-4 border-b border-border bg-panel/30">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Hero — {doc.hero.heroStyle} · {doc.hero.theme} · {doc.hero.alignment}</div>
              <div className="mt-2 text-sm font-black text-fg">{props.name}</div>
              {props.tagline && <div className="text-xs text-muted">{props.tagline}</div>}
            </div>
            <div className="p-4 space-y-4">
              {doc.blocks
                .filter((b) => b.visible)
                .map((b) => {
                  const Icon = BLOCK_ICON[b.type] ?? FileText;
                  const isSection = (SECTION_KEYS as readonly string[]).includes(b.type);
                  const label = isSection ? SECTION_LABELS[b.type as SectionKey] : b.type;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      className={`rounded-xl border p-3 cursor-pointer transition-colors ${selectedId === b.id ? "border-accent bg-accent-glow" : "border-border bg-bg/50 hover:border-accent/30"}`}
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-fg">
                        <Icon className="w-3.5 h-3.5 text-accent" /> {label}
                        {b.tierGate != null && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20">Tier {b.tierGate}+</span>}
                      </div>
                      <div className="mt-2 h-8 rounded bg-panel border border-border flex items-center justify-center text-[10px] text-muted">
                        {b.type} · {b.cols}/12
                      </div>
                    </div>
                  );
                })}
              {doc.blocks.filter((b) => b.visible).length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted">All blocks hidden — nothing to preview.</div>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted mt-2 text-center">
            Preview only — publish to push to <Link href={`/c/${props.handle}`} className="text-accent hover:underline">/c/{props.handle}</Link>.
          </p>
        </div>

        {/* Inspector */}
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-6 rounded-2xl border border-border bg-surface shadow-tile p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Inspector</h2>
            {!selected ? (
              <p className="text-xs text-muted mt-3">Select a block to edit its props, width, and access.</p>
            ) : (
              <div className="mt-3 space-y-4">
                <div>
                  <div className="text-sm font-bold text-fg flex items-center gap-2">
                    {(() => {
                      const Icon = BLOCK_ICON[selected.type] ?? FileText;
                      return <Icon className="w-4 h-4 text-accent" />;
                    })()}{" "}
                    {selected.type}
                  </div>
                  <div className="text-[10px] text-muted mt-0.5 font-mono">{selected.id}</div>
                </div>

                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Width (12-col)</span>
                  <select
                    value={selected.cols}
                    onChange={(e) => changeCols(selected.id, parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-bg text-sm"
                  >
                    <option value={12}>Full (12/12)</option>
                    <option value={8}>2/3 (8/12)</option>
                    <option value={6}>Half (6/12)</option>
                    <option value={4}>1/3 (4/12)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Tier gate</span>
                  <select
                    value={selected.tierGate ?? ""}
                    onChange={(e) => changeTierGate(selected.id, e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-bg text-sm"
                  >
                    <option value="">Free (no gate)</option>
                    {props.tiers.map((t) => (
                      <option key={t.id} value={t.rank}>
                        {t.name} (rank {t.rank})+
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  onClick={() => toggleVisible(selected.id)}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold ${selected.visible ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-border bg-bg text-muted"}`}
                >
                  {selected.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} {selected.visible ? "Visible" : "Hidden"}
                </button>

                <button onClick={() => removeBlock(selected.id)} className="w-full px-3 py-2 rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-bold">
                  Remove block
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableBlockRow({
  block,
  count,
  selected,
  onSelect,
  onToggle,
  onRemove,
}: {
  block: Block;
  count: number;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const Icon = BLOCK_ICON[block.type] ?? FileText;
  const style = { transform: CSS.Transform.toString(transform), transition };
  const label = (SECTION_KEYS as readonly string[]).includes(block.type) ? SECTION_LABELS[block.type as SectionKey] : block.type;
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 cursor-pointer ${isDragging ? "border-accent/50 shadow-soft" : "border-border"} ${selected ? "bg-accent-glow border-accent/30" : "bg-bg/50"} ${block.visible ? "" : "opacity-60"}`}
    >
      <button type="button" className="text-muted hover:text-fg cursor-grab active:cursor-grabbing touch-none" {...attributes} {...listeners} aria-label="Drag">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-7 h-7 rounded-lg bg-panel border border-border grid place-items-center text-muted shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-fg truncate">{label}</div>
        <div className="text-[10px] text-muted">{count} items · {block.cols}/12</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`w-7 h-7 rounded-lg grid place-items-center border ${block.visible ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-border bg-bg text-muted"}`}
          title={block.visible ? "Hide" : "Show"}
        >
          {block.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-7 h-7 rounded-lg grid place-items-center border border-border bg-bg text-muted hover:text-rose-600 hover:border-rose-500/30"
          title="Remove"
        >
          ×
        </button>
      </div>
    </div>
  );
}

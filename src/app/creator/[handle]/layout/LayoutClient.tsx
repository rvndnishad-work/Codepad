"use client";

import { useMemo, useState } from "react";
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
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Globe,
  Store,
  Eye,
  EyeOff,
  GripVertical,
  BookOpen,
  HelpCircle,
  Briefcase,
  Braces,
  Code2,
  FileText,
  Image as ImageIcon,
  Layers3,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
import { updateSpaceLayoutAction } from "../../actions";
import { SECTION_LABELS, type SectionKey, type LayoutSection } from "@/lib/creator/layout";
import ImageDropField from "./ImageDropField";

const SECTION_ICON: Record<SectionKey, LucideIcon> = {
  ABOUT: User,
  MEMBERSHIP: Sparkles,
  TUTORIAL: BookOpen,
  INTERVIEW_QA: HelpCircle,
  INTERVIEW_EXPERIENCE: Briefcase,
  CHALLENGE: Braces,
  SNIPPET: Code2,
  BLOG_POST: FileText,
};

type Props = {
  spaceId: string;
  handle: string;
  name: string;
  tagline: string | null;
  avatarUrl: string;
  coverUrl: string;
  heroStyle: "banner" | "minimal";
  alignment: "left" | "center" | "right";
  theme: "slate" | "glassmorphism" | "neon" | "minimalist";
  sections: LayoutSection[];
  counts: Record<SectionKey, number>;
};

export default function LayoutClient(props: Props) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(props.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(props.coverUrl);
  const [heroStyle, setHeroStyle] = useState<"banner" | "minimal">(props.heroStyle);
  const [alignment, setAlignment] = useState<"left" | "center" | "right">(props.alignment);
  const [theme, setTheme] = useState<"slate" | "glassmorphism" | "neon" | "minimalist">(props.theme);
  const [sections, setSections] = useState<LayoutSection[]>(props.sections);
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSections((prev) => {
      const from = prev.findIndex((s) => s.key === active.id);
      const to = prev.findIndex((s) => s.key === over.id);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
  }

  function toggle(key: SectionKey) {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s)));
  }

  function changeCols(key: SectionKey, cols: number) {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, cols } : s)));
  }

  async function save() {
    setBusy(true);
    try {
      await updateSpaceLayoutAction(props.spaceId, {
        avatarUrl,
        coverUrl,
        heroStyle,
        alignment,
        theme,
        sections,
      });
      toast.success("Public page layout saved.");
      router.refresh();
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  const isAboutVisible = useMemo(() => sections.find((s) => s.key === "ABOUT")?.visible !== false, [sections]);
  const isMembershipVisible = useMemo(() => sections.find((s) => s.key === "MEMBERSHIP")?.visible !== false, [sections]);
  const visibleContentSections = useMemo(() => sections.filter((s) => s.key !== "ABOUT" && s.key !== "MEMBERSHIP" && s.visible), [sections]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-fg">Public Page Layout</h1>
            <p className="text-xs text-muted mt-0.5">Design how /c/{props.handle} looks — banner, avatar, and section order.</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-soft text-bg text-xs font-bold uppercase tracking-wider shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save layout"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── Editor ── */}
        <div className="space-y-6">
          {/* Hero */}
          <section className="rounded-2xl border border-border bg-surface shadow-tile">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-fg leading-tight">Hero</h2>
                <p className="text-[11px] text-muted mt-0.5">Banner, avatar, and header style.</p>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <ImageDropField
                label="Banner image"
                hint="Wide image shown across the top of your page (3:1 works best)."
                value={coverUrl}
                onChange={setCoverUrl}
                variant="banner"
              />
              <div className="flex items-end gap-4">
                <ImageDropField label="Avatar" value={avatarUrl} onChange={setAvatarUrl} variant="avatar" />
                <div className="flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-1.5">Header style</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["banner", "minimal"] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setHeroStyle(style)}
                        className={`px-3 py-2 rounded-lg border text-xs font-bold capitalize transition-colors ${
                          heroStyle === style
                            ? "border-accent/50 bg-accent-glow text-fg"
                            : "border-border bg-bg/60 text-muted hover:text-fg"
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Theme & Alignment */}
          <section className="rounded-2xl border border-border bg-surface shadow-tile">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-fg leading-tight">Theme & Alignment</h2>
                <p className="text-[11px] text-muted mt-0.5">Customize theme palettes and layout alignments.</p>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* Alignment */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-2">Header Alignment</span>
                <div className="grid grid-cols-3 gap-2">
                  {(["left", "center", "right"] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setAlignment(align)}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold capitalize transition-colors ${
                        alignment === align
                          ? "border-accent/50 bg-accent-glow text-fg"
                          : "border-border bg-bg/60 text-muted hover:text-fg"
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Selector */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-2">Theme Style</span>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "slate", label: "Slate", desc: "Default dark look" },
                    { key: "glassmorphism", label: "Glassmorphism", desc: "Translucent glass blurs" },
                    { key: "neon", label: "Neon Cyber", desc: "High energy cyber glows" },
                    { key: "minimalist", label: "Minimalist", desc: "Borderless flat simplicity" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTheme(t.key as any)}
                      className={`p-3 rounded-xl border text-left transition-all relative ${
                        theme === t.key
                          ? "border-accent bg-accent-glow shadow-soft"
                          : "border-border bg-bg/40 hover:border-border-strong hover:bg-bg/60"
                      }`}
                    >
                      <div className="text-xs font-bold text-fg capitalize">{t.label}</div>
                      <div className="text-[10px] text-muted mt-0.5 leading-normal">{t.desc}</div>
                      {theme === t.key && (
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Sections */}
          <section className="rounded-2xl border border-border bg-surface shadow-tile">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent shrink-0">
                <Layers3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-fg leading-tight">Sections</h2>
                <p className="text-[11px] text-muted mt-0.5">Drag to reorder, toggle to show or hide.</p>
              </div>
            </div>
            <div className="p-4">
              <DndContext id="creator-layout-sections" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sections.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {sections.map((s) => (
                      <SortableSectionRow
                        key={s.key}
                        section={s}
                        count={props.counts[s.key] ?? 0}
                        onToggle={() => toggle(s.key)}
                        onChangeCols={(cols) => changeCols(s.key, cols)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </section>
        </div>

        {/* ── Live preview ── */}
        <div className="lg:sticky lg:top-6">
          <div className="flex items-center gap-2 mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            <Eye className="w-3.5 h-3.5" /> Live preview
          </div>
          <div className={`rounded-2xl border border-border bg-surface overflow-hidden shadow-tile theme-${theme} p-5 space-y-6 transition-all duration-300`}>
            {/* Hero preview */}
            {heroStyle === "banner" && coverUrl ? (
              <div className="relative">
                <div className="aspect-[3/1] w-full bg-panel rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className={`px-1 -mt-8 flex gap-3 pb-2 ${
                  alignment === "center" ? "flex-col items-center text-center" :
                  alignment === "right" ? "flex-row-reverse items-end justify-between text-right" :
                  "items-end text-left"
                }`}>
                  <Avatar avatarUrl={avatarUrl} name={props.name} ring />
                  <div className="pb-1 min-w-0">
                    <div className="text-base font-black text-fg truncate">{props.name}</div>
                    {props.tagline && <div className="text-xs text-muted truncate">{props.tagline}</div>}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`px-1 py-3 flex gap-3 ${
                alignment === "center" ? "flex-col items-center text-center" :
                alignment === "right" ? "flex-row-reverse items-center justify-between text-right w-full" :
                "items-center text-left"
              }`}>
                <Avatar avatarUrl={avatarUrl} name={props.name} />
                <div className="min-w-0">
                  <div className="text-base font-black text-fg truncate">{props.name}</div>
                  {props.tagline && <div className="text-xs text-muted truncate">{props.tagline}</div>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start text-left">
              {/* Left Column Preview (col-span-4) */}
              <div className="lg:col-span-4 space-y-4">
                {isAboutVisible && (
                  <div className="rounded-xl border border-border bg-surface p-3 theme-card text-xs text-muted leading-relaxed">
                    <div className={`flex items-center gap-1.5 font-bold text-fg mb-1.5 ${
                      alignment === "center" ? "justify-center" :
                      alignment === "right" ? "flex-row-reverse" : ""
                    }`}>
                      <User className="w-3.5 h-3.5 text-muted" /> About Me
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 rounded bg-elevated w-full" />
                      <div className="h-1.5 rounded bg-elevated w-5/6" />
                    </div>
                  </div>
                )}
                {isMembershipVisible && (
                  <div className="rounded-xl border border-accent/20 bg-accent/[0.03] p-3 theme-card-membership">
                    <div className={`flex items-center gap-1 text-[11px] font-bold text-accent mb-1.5 ${
                      alignment === "center" ? "justify-center" :
                      alignment === "right" ? "flex-row-reverse" : ""
                    }`}><Sparkles className="w-3.5 h-3.5" /> Membership</div>
                    <div className="flex flex-col gap-1.5">
                      <div className="h-8 rounded bg-accent/20 border border-accent/30 flex items-center justify-center text-[9px] font-bold text-accent">Tier 1</div>
                      <div className="h-8 rounded bg-accent/20 border border-accent/30 flex items-center justify-center text-[9px] font-bold text-accent">Tier 2</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column Preview (col-span-8) */}
              <div className="lg:col-span-8 grid grid-cols-12 gap-3 items-start">
                {!isAboutVisible && !isMembershipVisible && visibleContentSections.length === 0 && (
                  <div className="col-span-12 text-xs text-muted text-center py-6">All sections hidden.</div>
                )}
                {visibleContentSections.map((s) => {
                  const Icon = SECTION_ICON[s.key];
                  const count = props.counts[s.key] ?? 0;

                  const colSpanClass = {
                    1: "col-span-1",
                    2: "col-span-2",
                    3: "col-span-3",
                    4: "col-span-4",
                    5: "col-span-5",
                    6: "col-span-6",
                    7: "col-span-7",
                    8: "col-span-8",
                    9: "col-span-9",
                    10: "col-span-10",
                    11: "col-span-11",
                    12: "col-span-12",
                  }[s.cols || 12] || "col-span-12";

                  return (
                    <div key={s.key} className={`${colSpanClass} p-4 rounded-xl border border-border bg-surface space-y-3 theme-card`}>
                      <div className={`flex items-center gap-1.5 text-xs font-bold text-fg pb-2 border-b border-border ${
                        alignment === "center" ? "justify-center" :
                        alignment === "right" ? "flex-row-reverse" : ""
                      }`}>
                        <Icon className="w-3.5 h-3.5 text-accent" /> {SECTION_LABELS[s.key]}
                      </div>
                      {count === 0 ? (
                        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-muted">
                          No items yet
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {Array.from({ length: Math.min(count, 2) }).map((_, i) => (
                            <div key={i} className="rounded-lg border border-border bg-bg/50 px-2.5 py-2 flex flex-col justify-center h-[40px] theme-card">
                              <div className="h-1.5 rounded bg-elevated w-5/6" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted/70 mt-2 text-center">Unsaved changes shown — click “Save layout” to publish them.</p>
        </div>
      </div>
    </div>
  );
}

function Avatar({ avatarUrl, name, ring }: { avatarUrl: string; name: string; ring?: boolean }) {
  const cls = `w-14 h-14 rounded-2xl object-cover bg-surface ${ring ? "border-2 border-surface ring-1 ring-border" : "border border-border"}`;
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className={cls} />;
  }
  return (
    <div className={`${cls} grid place-items-center bg-accent/10 text-accent`}>
      <Store className="w-6 h-6" />
    </div>
  );
}

function SortableSectionRow({
  section,
  count,
  onToggle,
  onChangeCols,
}: {
  section: LayoutSection;
  count: number;
  onToggle: () => void;
  onChangeCols: (cols: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.key });
  const Icon = SECTION_ICON[section.key];
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2.5 rounded-xl border bg-bg/50 px-3 py-2.5 transition-colors ${
        isDragging ? "border-accent/50 shadow-soft" : "border-border"
      } ${section.visible ? "" : "opacity-60"}`}
    >
      <button
        type="button"
        className="text-muted hover:text-fg cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-7 h-7 rounded-lg bg-panel border border-border grid place-items-center text-muted shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 mr-auto">
        <div className="text-sm font-semibold text-fg truncate">{SECTION_LABELS[section.key]}</div>
        <div className="text-[10px] text-muted">{count} {count === 1 ? "item" : "items"}</div>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={section.cols}
          onChange={(e) => onChangeCols(Number(e.target.value))}
          className="px-2 py-1 rounded bg-panel border border-border text-[10px] text-fg font-semibold hover:border-border-strong cursor-pointer outline-none"
          title="Section Width (12-column grid)"
        >
          <option value={12}>Full (12/12)</option>
          <option value={9}>3/4 Width (9/12)</option>
          <option value={8}>2/3 Width (8/12)</option>
          <option value={6}>Half (6/12)</option>
          <option value={4}>1/3 Width (4/12)</option>
          <option value={3}>1/4 Width (3/12)</option>
        </select>
        <button
          type="button"
          onClick={onToggle}
          title={section.visible ? "Hide section" : "Show section"}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors ${
            section.visible
              ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
              : "text-muted border-border hover:text-fg"
          }`}
        >
          {section.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {section.visible ? "Shown" : "Hidden"}
        </button>
      </div>
    </div>
  );
}

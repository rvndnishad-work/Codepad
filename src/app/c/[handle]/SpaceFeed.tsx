"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  List,
  LayoutGrid,
  Check,
  Lock,
  ChevronRight,
  ChevronLeft,
  Layers,
} from "lucide-react";
import { BuyContentButton } from "@/app/creator/BuyButton";
import { SECTION_META, type ContentSectionKey, type SpaceCard } from "./space-cards";

const VIEW_KEY = "cs_feed_view";
const PAGE_SIZE = 8;

type ViewMode = "list" | "grid";
type Filter = "ALL" | ContentSectionKey;

/**
 * The posts feed of a public creator space: ONE mixed, newest-first stream
 * (so visitors aren't met with five walls of category sections), paginated
 * client-side, with category chips for anyone who wants a specific type.
 * List rows are the default; a persisted toggle switches to the card grid.
 */
export default function SpaceFeed({
  sections,
}: {
  sections: { key: ContentSectionKey; cards: SpaceCard[] }[];
}) {
  const [view, setView] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Syncing initial state from localStorage (an external store) — the one
    // legitimate setState-in-effect case; SSR must not read storage.
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "grid") setView("grid");
    } catch {
      /* ignore */
    }
  }, []);

  const pickView = (v: ViewMode) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  // Creator's section order drives chip order; the feed itself mixes types.
  const allCards = useMemo(
    () =>
      sections
        .flatMap((s) => s.cards)
        .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso)),
    [sections],
  );

  const filtered = filter === "ALL" ? allCards : allCards.filter((c) => c.sectionKey === filter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageCards = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), pageCount));
    // Keep the reader oriented: snap back to the top of the feed.
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pickFilter = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };

  if (allCards.length === 0) return null;

  return (
    <section id="posts" ref={topRef} className="scroll-mt-32">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-fg leading-none">Posts</h2>
            <p className="text-[11px] text-muted mt-1.5">
              {filtered.length} post{filtered.length === 1 ? "" : "s"}
              {filter !== "ALL" ? ` in ${SECTION_META[filter].label}` : " — newest first"}
            </p>
          </div>
        </div>
        <div className="flex items-center rounded-lg border border-border/50 bg-surface p-0.5" role="group" aria-label="View mode">
          <ViewBtn active={view === "list"} onClick={() => pickView("list")} Icon={List} label="List view" />
          <ViewBtn active={view === "grid"} onClick={() => pickView("grid")} Icon={LayoutGrid} label="Grid view" />
        </div>
      </div>

      {/* Category chips — the escape hatch for type-specific browsing */}
      <div className="mb-5 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip active={filter === "ALL"} onClick={() => pickFilter("ALL")} label="All" count={allCards.length} />
        {sections.map((s) => {
          const meta = SECTION_META[s.key];
          return (
            <FilterChip
              key={s.key}
              active={filter === s.key}
              onClick={() => pickFilter(s.key)}
              label={meta.label}
              count={s.cards.length}
              Icon={meta.Icon}
            />
          );
        })}
      </div>

      {/* Feed */}
      {view === "list" ? (
        <div className="rounded-2xl border border-border/50 bg-surface/60 shadow-tile divide-y divide-border/30 overflow-hidden">
          {pageCards.map((card) => (
            <ListRow key={card.key} card={card} showType={filter === "ALL"} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {pageCards.map((card) => (
            <GridCard key={card.key} card={card} showType={filter === "ALL"} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11px] text-muted font-semibold tabular-nums">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <PageBtn disabled={safePage === 1} onClick={() => goToPage(safePage - 1)} label="Previous page">
              <ChevronLeft className="w-3.5 h-3.5" />
            </PageBtn>
            {pageNumbers(safePage, pageCount).map((p, i) =>
              p === "…" ? (
                <span key={`gap-${i}`} className="px-1 text-muted text-xs select-none">
                  …
                </span>
              ) : (
                <PageBtn key={p} active={p === safePage} onClick={() => goToPage(p)} label={`Page ${p}`}>
                  <span className="tabular-nums">{p}</span>
                </PageBtn>
              ),
            )}
            <PageBtn disabled={safePage === pageCount} onClick={() => goToPage(safePage + 1)} label="Next page">
              <ChevronRight className="w-3.5 h-3.5" />
            </PageBtn>
          </div>
        </div>
      )}
    </section>
  );
}

/** Windowed page numbers: 1 … around-current … last. */
function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

function PageBtn({
  children,
  onClick,
  disabled,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`min-w-7 h-7 px-1.5 rounded-lg grid place-items-center text-[11px] font-bold transition-colors disabled:opacity-30 disabled:pointer-events-none ${
        active ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-panel/50"
      }`}
    >
      {children}
    </button>
  );
}

function ViewBtn({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof List;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`w-7 h-6 rounded-md grid place-items-center transition-colors ${
        active ? "bg-accent text-bg" : "text-muted hover:text-fg"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  Icon?: typeof List;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${
        active
          ? "bg-accent text-bg shadow-soft"
          : "text-muted hover:text-fg bg-panel/40 hover:bg-panel/70 border border-border/40"
      }`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label}
      <span className={`text-[9px] font-black tabular-nums rounded-full px-1.5 py-px ${active ? "bg-bg/20" : "bg-bg/40 text-muted"}`}>
        {count}
      </span>
    </button>
  );
}

function AccessState({ card, size = "sm" }: { card: SpaceCard; size?: "sm" | "md" }) {
  const text = size === "md" ? "text-[11px]" : "text-[10px]";
  if (card.unlocked) {
    return card.accessTierRank != null ? (
      <span className={`inline-flex items-center gap-1 font-bold text-emerald-500 ${text}`}>
        <Check className="w-3 h-3" /> Unlocked
      </span>
    ) : (
      <span className={`font-bold uppercase tracking-wider text-emerald-500 ${text}`}>Free</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/25 rounded-full px-2 py-0.5">
      <Lock className="w-2.5 h-2.5" />
      {card.tierName ?? "Members"}
    </span>
  );
}

function RowAction({ card }: { card: SpaceCard }) {
  if (card.unlocked) return <AccessState card={card} />;
  if (card.purchase) {
    return (
      <BuyContentButton
        spaceContentId={card.purchase.spaceContentId}
        priceCents={card.purchase.priceCents}
        currency={card.purchase.currency}
      />
    );
  }
  return (
    <a href="#membership" className="text-[10px] font-bold uppercase tracking-wider text-accent hover:underline">
      Join to unlock
    </a>
  );
}

/** Small colored type tag shown in the mixed feed so rows stay identifiable. */
const TYPE_TONE: Record<ContentSectionKey, string> = {
  TUTORIAL: "text-violet-400",
  INTERVIEW_QA: "text-rose-400",
  INTERVIEW_EXPERIENCE: "text-sky-400",
  CHALLENGE: "text-amber-400",
  SNIPPET: "text-emerald-400",
  BLOG_POST: "text-fuchsia-400",
};

function TypeTag({ sectionKey }: { sectionKey: ContentSectionKey }) {
  const meta = SECTION_META[sectionKey];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${TYPE_TONE[sectionKey]}`}>
      <meta.Icon className="w-2.5 h-2.5" /> {meta.label}
    </span>
  );
}

/* ── list row (default view) ─────────────────────────────────────────────── */

function ListRow({ card, showType }: { card: SpaceCard; showType: boolean }) {
  const meta = SECTION_META[card.sectionKey];
  return (
    <div className="group flex items-center gap-4 px-3.5 py-3 hover:bg-panel/25 transition-colors">
      {/* Thumb */}
      <Link href={card.href} className="relative w-24 h-14 rounded-lg overflow-hidden bg-panel/60 shrink-0 hidden sm:block">
        {card.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.cover}
            alt=""
            className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} grid place-items-center`}>
            <meta.Icon className="w-4.5 h-4.5 text-fg/30" />
          </div>
        )}
        {!card.unlocked && (
          <span className="absolute inset-0 grid place-items-center bg-bg/40 backdrop-blur-[1px]">
            <Lock className="w-3.5 h-3.5 text-accent" />
          </span>
        )}
      </Link>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {showType && <TypeTag sectionKey={card.sectionKey} />}
        </div>
        <Link
          href={card.href}
          className="text-sm font-bold text-fg group-hover:text-accent transition-colors line-clamp-1 leading-snug"
        >
          {card.title}
        </Link>
        {card.summary && <p className="text-[11px] text-muted line-clamp-1 mt-0.5 leading-relaxed">{card.summary}</p>}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {card.chips.slice(0, 3).map((c) => (
            <span key={c} className="text-[9px] font-bold uppercase tracking-wider text-muted bg-panel/50 rounded px-1.5 py-0.5">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Access / action */}
      <div className="flex items-center gap-3 shrink-0">
        <RowAction card={card} />
        <ChevronRight className="w-4 h-4 text-muted/40 group-hover:text-accent group-hover:translate-x-0.5 transition-all hidden sm:block" />
      </div>
    </div>
  );
}

/* ── grid card (toggle view) ─────────────────────────────────────────────── */

function GridCard({ card, showType }: { card: SpaceCard; showType: boolean }) {
  const meta = SECTION_META[card.sectionKey];
  return (
    <div className="group h-full rounded-2xl border border-border/50 bg-surface/60 overflow-hidden shadow-tile hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <Link href={card.href} className="block relative aspect-[21/9] bg-panel/60 overflow-hidden">
        {card.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.cover}
            alt=""
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} grid place-items-center`}>
            <meta.Icon className="w-7 h-7 text-fg/25 group-hover:scale-110 transition-transform duration-300" />
          </div>
        )}
        {!card.unlocked && (
          <span className="absolute top-2 right-2">
            <AccessState card={card} />
          </span>
        )}
      </Link>
      <div className="p-4 flex flex-col gap-2 flex-1">
        {showType && <TypeTag sectionKey={card.sectionKey} />}
        <Link href={card.href} className="text-sm font-bold text-fg group-hover:text-accent transition-colors line-clamp-2 leading-snug">
          {card.title}
        </Link>
        {card.summary && <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">{card.summary}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {card.chips.slice(0, 3).map((c) => (
              <span key={c} className="text-[9px] font-bold uppercase tracking-wider text-muted bg-panel/50 rounded px-1.5 py-0.5">
                {c}
              </span>
            ))}
          </div>
          <div className="shrink-0">
            <RowAction card={card} />
          </div>
        </div>
      </div>
    </div>
  );
}

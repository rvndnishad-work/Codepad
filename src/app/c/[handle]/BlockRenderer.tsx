"use client";

import { Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import type { SpaceBlocksDoc, Block } from "@/lib/creator/blocks";
import type { SpaceCard } from "./space-cards";
import SpaceFeed from "./SpaceFeed";
import LatestCarousel from "./LatestCarousel";
import BlockErrorBoundary from "./BlockErrorBoundary";

type Props = {
  doc: SpaceBlocksDoc;
  allCards: SpaceCard[];
  carouselItems: SpaceCard[];
  sectionsByKey: Map<string, SpaceCard[]>;
  // Membership gate for custom blocks
  membershipRank: number | null;
  isOwner: boolean;
  entitledKeys: Set<string>;
};

function BlockFallback({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface/40 p-6 animate-pulse">
      <div className="h-4 w-24 bg-panel rounded mb-3" />
      <div className="h-3 w-full bg-panel rounded mb-2" />
      <div className="h-3 w-5/6 bg-panel rounded" />
      <span className="sr-only">Loading {label}</span>
    </div>
  );
}

function SingleSectionBlock({ block, cards }: { block: Block; cards: SpaceCard[] }) {
  const shouldReduceMotion = useReducedMotion();
  if (!block.visible) return null;
  return (
    <BlockErrorBoundary fallbackLabel={block.type}>
      <Suspense fallback={<BlockFallback label={block.type} />}>
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <SpaceFeed sections={[{ key: block.type as unknown as SpaceCard["sectionKey"], cards }]} />
        </motion.div>
      </Suspense>
    </BlockErrorBoundary>
  );
}

function isCustomType(t: string): boolean {
  return ["CTA", "GALLERY", "FAQ", "TESTIMONIAL", "NEWSLETTER", "EMBED", "HERO"].includes(t);
}

function canSeeBlock(block: Block, membershipRank: number | null, isOwner: boolean, entitledKeys: Set<string>): boolean {
  if (isOwner) return true;
  if (block.tierGate == null) return true;
  if (entitledKeys.has(block.id)) return true;
  return membershipRank != null && membershipRank >= block.tierGate;
}

export default function BlockRenderer({ doc, allCards, carouselItems, sectionsByKey, membershipRank, isOwner, entitledKeys }: Props) {
  const shouldReduceMotion = useReducedMotion();
  const sectionBlocks = doc.blocks.filter((b) => b.visible && sectionsByKey.has(b.type));

  // If no section blocks have cards, the page-level empty state in page.tsx handles it.
  // This component only renders the feed stream.
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: shouldReduceMotion ? 0 : 0.08 }}
    >
      {carouselItems.length > 0 && (
        <BlockErrorBoundary fallbackLabel="Latest">
          <Suspense fallback={<BlockFallback label="Latest" />}>
            <motion.section
              id="latest"
              className="scroll-mt-32"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <LatestCarousel items={carouselItems} />
            </motion.section>
          </Suspense>
        </BlockErrorBoundary>
      )}

      {sectionBlocks.map((block) => {
        const cards = sectionsByKey.get(block.type) ?? [];
        if (cards.length === 0) return null;
        return (
          <div key={block.id} className="scroll-mt-32" id={`section-${block.type.toLowerCase()}`}>
            <SingleSectionBlock block={block} cards={cards} />
          </div>
        );
      })}

      {/* Custom marketing blocks — in creator order, gated by tierGate */}
      {doc.blocks
        .filter((b) => b.visible && isCustomType(b.type))
        .map((block) => {
          const locked = !canSeeBlock(block, membershipRank, isOwner, entitledKeys);
          return (
            <div key={block.id} id={`block-${block.id}`} className="scroll-mt-32">
              <BlockErrorBoundary fallbackLabel={block.type}>
                <Suspense fallback={<BlockFallback label={block.type} />}>
                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {locked ? (
                      <div className="rounded-2xl border border-accent/20 bg-accent/[0.04] backdrop-blur p-6 flex items-center justify-between gap-4">
                        <div className="text-sm font-semibold text-muted">
                          {block.type} gated — {block.tierGate != null ? `Tier ${block.tierGate}+` : "Members"} to view
                        </div>
                        <a href="#membership" className="text-xs font-bold text-accent hover:underline">
                          Join to unlock
                        </a>
                      </div>
                    ) : (
                      <CustomBlock block={block} />
                    )}
                  </motion.div>
                </Suspense>
              </BlockErrorBoundary>
            </div>
          );
        })}

      {/* Fallback: if blocks contain no visible sections with cards, the
           legacy mixed-feed path in page.tsx (allCards) still renders.
           Stage 4 will replace this with a dedicated EmptyBlock. */}
      {sectionBlocks.length === 0 && allCards.length > 0 && (
        <BlockErrorBoundary fallbackLabel="Posts">
          <Suspense fallback={<BlockFallback label="Posts" />}>
            <SpaceFeed
              sections={[...sectionsByKey.entries()]
                .filter(([, cards]) => cards.length > 0)
                .map(([key, cards]) => ({ key: key as SpaceCard["sectionKey"], cards }))}
            />
          </Suspense>
        </BlockErrorBoundary>
      )}
    </motion.div>
  );
}

function CustomBlock({ block }: { block: Block }) {
  const p = (block.props ?? {}) as Record<string, unknown>;
  switch (block.type) {
    case "CTA": {
      const title = (p.title as string) ?? "Join now";
      const href = (p.href as string) ?? "#membership";
      const variant = (p.variant as string) ?? "primary";
      const sub = p.sub as string | undefined;
      const cls =
        variant === "secondary"
          ? "border border-border bg-panel hover:bg-panel/80 text-fg"
          : variant === "ghost"
            ? "border border-white/15 bg-white/10 backdrop-blur text-white hover:bg-white/15"
            : "bg-[#FFE600] hover:bg-[#FFD600] text-black shadow-[0_8px_20px_-8px_rgba(255,230,0,0.6)]";
      return (
        <div className="rounded-[1.5rem] border border-border bg-surface p-6 md:p-7 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="text-lg md:text-xl font-black tracking-tight">{title}</div>
            {sub && <div className="text-sm text-muted mt-1">{sub}</div>}
          </div>
          <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black transition ${cls}`}>
            {title}
          </Link>
        </div>
      );
    }
    case "GALLERY": {
      const images = (p.images as string[]) ?? [];
      const caption = p.caption as string | undefined;
      if (images.length === 0) return <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted">Gallery — add images in Studio → Design</div>;
      return (
        <div className="rounded-[1.5rem] border border-border bg-surface overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-1 p-1 bg-panel/30">
            {images.slice(0, 8).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className={`w-full h-28 md:h-32 object-cover rounded-xl border border-border/40 ${i === 0 ? "col-span-8 row-span-2 h-56 md:h-64" : "col-span-4"}`} />
            ))}
          </div>
          {caption && <div className="px-4 py-2 text-xs text-muted">{caption}</div>}
        </div>
      );
    }
    case "FAQ": {
      const items = (p.items as { q: string; a: string }[]) ?? [];
      return (
        <div className="rounded-[1.5rem] border border-border bg-surface p-5 md:p-6 space-y-3">
          <div className="text-sm font-black">FAQ</div>
          <div className="divide-y divide-border/60">
            {items.map((it, i) => (
              <details key={i} className="group py-3">
                <summary className="list-none flex items-center justify-between gap-3 text-sm font-bold cursor-pointer">
                  {it.q}
                  <span className="w-6 h-6 rounded-full border border-border grid place-items-center text-muted group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="text-sm text-muted mt-2 leading-relaxed">{it.a}</div>
              </details>
            ))}
          </div>
        </div>
      );
    }
    case "TESTIMONIAL": {
      const quote = (p.quote as string) ?? "This space helped me land my offer.";
      const author = (p.author as string) ?? "A member";
      const role = p.role as string | undefined;
      return (
        <div className="rounded-[1.5rem] border border-border bg-gradient-to-br from-accent/[0.08] via-surface to-violet-500/[0.04] p-6 md:p-7">
          <div className="text-lg md:text-xl font-semibold leading-relaxed">“{quote}”</div>
          <div className="mt-3 text-xs font-bold text-muted">
            — {author}
            {role ? `, ${role}` : ""}
          </div>
        </div>
      );
    }
    case "NEWSLETTER": {
      const placeholder = (p.placeholder as string) ?? "you@example.com";
      const cta = (p.cta as string) ?? "Subscribe";
      return (
        <form
          onSubmit={(e) => e.preventDefault()}
          className="rounded-[1.5rem] border border-border bg-surface p-5 flex flex-col md:flex-row items-center gap-3"
        >
          <div className="text-sm font-black flex-1">Stay in the loop</div>
          <input placeholder={placeholder} className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-border bg-bg text-sm" />
          <button type="submit" className="px-4 py-2 rounded-xl bg-accent text-bg text-sm font-black">
            {cta}
          </button>
        </form>
      );
    }
    case "EMBED": {
      const url = (p.url as string) ?? "";
      if (!url || url === "https://") return <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted">Embed — add a URL in Studio</div>;
      return (
        <div className="rounded-[1.5rem] border border-border bg-surface overflow-hidden">
          <div className="aspect-[16/9] bg-panel">
            <iframe src={url} title="embed" className="w-full h-full" loading="lazy" />
          </div>
        </div>
      );
    }
    default:
      return <div className="rounded-2xl border border-border bg-surface p-4 text-xs text-muted">Unknown block {block.type}</div>;
  }
}

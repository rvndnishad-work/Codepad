"use client";

import { Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { SpaceBlocksDoc, Block } from "@/lib/creator/blocks";
import type { SpaceCard } from "./space-cards";
import SpaceFeed from "./SpaceFeed";
import LatestCarousel from "./LatestCarousel";
import BlockErrorBoundary from "./BlockErrorBoundary";

/**
 * Stage 3 streaming shell.
 * Render order is `blocksDoc.blocks` order so a creator's drag in the
 * studio is immediately reflected on the public page. Non-section blocks
 * (HERO/CTA etc.) are skipped for now and will be wired in Stage 4+.
 */
type Props = {
  doc: SpaceBlocksDoc;
  allCards: SpaceCard[];
  carouselItems: SpaceCard[];
  // Pre-computed helper to avoid re-filtering inside each block
  sectionsByKey: Map<string, SpaceCard[]>;
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

export default function BlockRenderer({ doc, allCards, carouselItems, sectionsByKey }: Props) {
  const shouldReduceMotion = useReducedMotion();
  // Collect visible section blocks in creator order
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

      {/* Stream each content section as its own Suspense boundary so large
          feeds don't block the shell. Until Stage 4 palette provides richer
          per-block props, we render them as individual SpaceFeed slices. */}
      {sectionBlocks.map((block) => {
        const cards = sectionsByKey.get(block.type) ?? [];
        if (cards.length === 0) return null;
        return (
          <div key={block.id} className="scroll-mt-32" id={`section-${block.type.toLowerCase()}`}>
            <SingleSectionBlock block={block} cards={cards} />
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
      {/* Virtualization hint: feeds >100 cards should virtualize list rows in Stage 7+;
          current SpaceFeed paginates at PAGE_SIZE=8, so shell stays responsive. */}
    </motion.div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lightbulb,
  Play,
  Sparkles,
} from "lucide-react";
import type { VideoEmbed } from "@/lib/video";

export type TrackHelpContext = {
  trackSlug: string;
  trackTitle: string;
  /** e.g. "Step 2 of 3" — only set for multi-step series. Null hides the
   *  track breadcrumb row entirely (single-step challenges). */
  positionLabel: string | null;
  authorNote: string | null;
  hint: string | null;
  video: VideoEmbed | null;
};

/**
 * Renders the per-item walkthrough/hint/video controls when a participant
 * arrives at a challenge from a track context (i.e. the URL carries
 * ?track=<slug>). The hint is hidden behind a toggle so participants only
 * see it on demand — pedagogically right.
 *
 * Three independent disclosure groups (author note, hint, video) so users
 * can open the ones they want without the others stealing space.
 */
export default function TrackHelpPanel({ context }: { context: TrackHelpContext }) {
  const [hintOpen, setHintOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  const hasHint = !!context.hint;
  const hasVideo = !!context.video;
  const hasNote = !!context.authorNote;

  // Nothing to show? Render only the breadcrumb so users still know they're
  // inside a track context.
  const hasContent = hasHint || hasVideo || hasNote;

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 mb-4">
      {/* Breadcrumb to the parent series — multi-step challenges only. */}
      {context.positionLabel && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href={`/challenges/${context.trackSlug}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-accent hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="truncate max-w-[260px]">{context.trackTitle}</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-accent/70 bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
            <Sparkles className="w-3 h-3" />
            {context.positionLabel}
          </span>
        </div>
      )}

      {hasNote && (
        <p className="text-xs md:text-sm text-fg/80 italic mt-3 leading-relaxed border-l-2 border-accent/30 pl-3">
          {context.authorNote}
        </p>
      )}

      {hasContent && (hasHint || hasVideo) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {hasHint && (
            <button
              type="button"
              onClick={() => setHintOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold hover:bg-amber-500/20 transition"
              aria-expanded={hintOpen}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              {hintOpen ? "Hide hint" : "Show hint"}
              {hintOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
          {hasVideo && (
            <button
              type="button"
              onClick={() => setVideoOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold hover:bg-rose-500/20 transition"
              aria-expanded={videoOpen}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {videoOpen ? "Hide video" : "Watch video"}
              {videoOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      )}

      {hasHint && hintOpen && (
        <div className="mt-3 rounded-lg bg-bg/60 border border-border p-3 text-sm text-fg/90 leading-relaxed whitespace-pre-wrap">
          {context.hint}
        </div>
      )}

      {hasVideo && videoOpen && context.video && <VideoBlock video={context.video} />}
    </div>
  );
}

function VideoBlock({ video }: { video: VideoEmbed }) {
  // YouTube / Vimeo / Loom embed inline. Anything else gets a styled link so
  // we never iframe a hostile URL — the parsing utility already filtered for
  // recognised hosts.
  if (video.kind === "other") {
    return (
      <a
        href={video.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-bg/60 border border-border text-xs font-bold text-fg hover:border-border-strong transition"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Open video in new tab
      </a>
    );
  }

  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-border bg-bg/60 aspect-video">
      <iframe
        src={video.embedUrl}
        className="w-full h-full"
        title="Walkthrough video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { type ReactNode } from "react";
import RevealOnScroll from "@/components/scroll/RevealOnScroll";

/**
 * The ONE heading pattern for homepage sections: accent eyebrow pill,
 * display title, optional lede, optional right-aligned "view all" link.
 *
 * Extracted so radius/typography/eyebrow recipes can never drift apart
 * again — every section renders its header through this.
 *
 * `eyebrowIcon` is a rendered element (e.g. <Target className="w-3.5 h-3.5" />),
 * NOT a component reference — server components render these headings and
 * functions cannot cross the server→client boundary.
 */
export default function SectionHeading({
  eyebrow,
  eyebrowIcon,
  title,
  highlight,
  lede,
  linkHref,
  linkLabel,
  align = "center",
}: {
  /** Small uppercase kicker above the title. */
  eyebrow: string;
  /** Pre-rendered icon element sized ~w-3.5 h-3.5. */
  eyebrowIcon?: ReactNode;
  /** Plain-text lead-in of the headline. */
  title: string;
  /** Gradient-highlighted tail of the headline. */
  highlight?: string;
  /** Optional one-line supporting sentence under the title. */
  lede?: string;
  linkHref?: string;
  linkLabel?: string;
  align?: "center" | "left";
}) {
  const centered = align === "center";
  return (
    <RevealOnScroll
      className={`flex flex-col ${centered ? "items-center text-center" : "items-start text-left"} gap-4 mb-14 md:mb-20`}
    >
      <div
        className={`flex w-full items-center gap-4 ${centered ? "flex-col" : "justify-between"}`}
      >
        <div className={`space-y-4 ${centered ? "flex flex-col items-center" : ""}`}>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-accent">
            {eyebrowIcon}
            {eyebrow}
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-fg leading-[1.08]">
            {title}
            {highlight ? (
              <>
                {" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent-soft">
                  {highlight}
                </span>
              </>
            ) : null}
          </h2>
          {lede ? (
            <p className={`text-muted text-base md:text-lg leading-relaxed font-medium max-w-2xl ${centered ? "mx-auto" : ""}`}>
              {lede}
            </p>
          ) : null}
        </div>

        {linkHref && linkLabel ? (
          <Link
            href={linkHref}
            className="group shrink-0 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-fg transition-colors"
          >
            {linkLabel}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        ) : null}
      </div>
    </RevealOnScroll>
  );
}

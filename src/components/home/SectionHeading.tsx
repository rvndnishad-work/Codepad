"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import RevealOnScroll from "@/components/scroll/RevealOnScroll";

/**
 * THE ONE SECTION HEADER.
 *
 * Set like the opening of a numbered spec clause rather than a centred
 * marketing title:
 *
 *   03 ──── THE PREP ARSENAL ────────────────────────────────
 *   Everything between you
 *   and the offer.
 *   <lede, held to a 60-character measure>
 *
 * The index and the rule that runs off to the right are what make it
 * recognisable; the eyebrow is monospaced metadata, not a coloured pill. Left
 * alignment is the default — centred headings are the single most reliable
 * tell of a template, and a left-set column also gives the section something
 * to hang its grid off.
 *
 * `eyebrowIcon` is a rendered element, NOT a component reference — server
 * components render these headings and functions cannot cross the boundary.
 */
export default function SectionHeading({
  index,
  eyebrow,
  eyebrowIcon,
  title,
  highlight,
  lede,
  linkHref,
  linkLabel,
  align = "left",
  tone = "accent",
}: {
  /** Two-digit clause number, e.g. "03". Omit on one-off sections. */
  index?: string;
  /** Small uppercase kicker — rendered as monospaced metadata. */
  eyebrow: string;
  /** Pre-rendered icon element sized ~w-3.5 h-3.5. */
  eyebrowIcon?: ReactNode;
  /** Plain-text lead-in of the headline. */
  title: string;
  /** The one word or phrase that carries colour. Never a gradient. */
  highlight?: string;
  /** Optional one-line supporting sentence under the title. */
  lede?: string;
  linkHref?: string;
  linkLabel?: string;
  align?: "center" | "left";
  /** Brand tone: developer sections use `accent`, hiring sections `secondary`. */
  tone?: "accent" | "secondary";
}) {
  const centered = align === "center";
  const labelTone = tone === "secondary" ? "ip-label-secondary" : "ip-label-accent";
  const indexTone = tone === "secondary" ? "text-secondary" : "text-accent";
  const highlightTone = tone === "secondary" ? "text-secondary" : "text-accent";

  return (
    <RevealOnScroll
      className={`mb-12 flex flex-col md:mb-16 ${centered ? "items-center text-center" : "items-start"}`}
    >
      {/* Metadata line: index, label, and a rule that runs to the edge of the
          measure. The rule is the section's own top border, drawn short. */}
      <div className={`flex w-full items-center gap-3 ${centered ? "justify-center" : ""}`}>
        {index && <span className={`ip-index ${indexTone}`}>{index}</span>}
        <span className={`ip-label ${labelTone} flex items-center gap-1.5`}>
          {eyebrowIcon}
          {eyebrow}
        </span>
        {!centered && <span className="ip-rule min-w-4 flex-1" aria-hidden />}
      </div>

      <div
        className={`mt-6 flex w-full gap-8 ${
          centered ? "flex-col items-center" : "flex-col md:flex-row md:items-end md:justify-between"
        }`}
      >
        <div className={centered ? "flex flex-col items-center" : "max-w-3xl"}>
          <h2 className="ip-display ip-display-lg text-fg">
            {title}
            {highlight ? (
              <>
                {" "}
                <span className={highlightTone}>{highlight}</span>
              </>
            ) : null}
          </h2>
          {lede ? (
            <p
              className={`mt-5 max-w-[60ch] text-[15px] leading-relaxed text-muted ${
                centered ? "mx-auto" : ""
              }`}
            >
              {lede}
            </p>
          ) : null}
        </div>

        {linkHref && linkLabel ? (
          <Link href={linkHref} className="ip-link shrink-0 self-start text-[13px] md:self-end">
            {linkLabel}
            <span aria-hidden>→</span>
          </Link>
        ) : null}
      </div>
    </RevealOnScroll>
  );
}

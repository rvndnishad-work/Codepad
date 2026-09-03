import Link from "next/link";
import { ArrowRight } from "lucide-react";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
import SignalStrip, {
  CANDIDATE_STAGES,
  RECRUITER_STAGES,
} from "@/components/home/SignalStrip";

/**
 * The closing band.
 *
 * A full-bleed INK BLOCK rather than a rounded gradient panel floating inside
 * a container. Inverting the page for one band is the loudest move the design
 * system allows, so it is spent exactly once, at the end, on the ask: dark on
 * a light page, light on a dark one. `.ip-invert` re-keys the tokens inside so
 * the flip never strands a colour on the wrong ground. The blueprint field is
 * drawn in the band's own text colour, and the closing signal strip repeats
 * the motif the hero opened with — the page starts and ends on the same shape.
 */
export default function HomeFinalCTA({
  persona = "candidate",
}: {
  persona?: "candidate" | "recruiter";
}) {
  const isRecruiter = persona === "recruiter";

  const headline = isRecruiter ? "Hire on evidence." : "Walk in prepared.";
  const subtitle = isRecruiter
    ? "Live coding interviews, async take-homes and AI screening at batch scale — one workspace for the whole pipeline, with a replayable record behind every decision."
    : "Practice in the same sandbox you'll be interviewed in, then let the work speak for itself with a portfolio anyone can open and run.";
  const buttonText = isRecruiter ? "Create a workspace" : "Get started — free";
  const linkHref = isRecruiter ? "/login?next=/dashboard" : "/login";
  const secondaryHref = isRecruiter ? "/pricing" : "/challenges";
  const secondaryLabel = isRecruiter ? "See pricing" : "Browse challenges";

  return (
    <section className="ip-invert relative overflow-hidden bg-ink text-ink-fg">
      <div
        aria-hidden
        className="ip-blueprint-current pointer-events-none absolute inset-0 opacity-[0.07]"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
        <RevealOnScroll stagger={0.08} className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <RevealItem className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="h-[5px] w-[5px] bg-accent" aria-hidden />
              <span className="ip-label" style={{ color: "inherit", opacity: 0.6 }}>
                {isRecruiter ? "For hiring teams" : "For developers"}
              </span>
            </div>
            <h2 className="ip-display ip-display-xl mt-6">{headline}</h2>
          </RevealItem>

          <RevealItem className="flex flex-col justify-end lg:col-span-5">
            <p className="max-w-[46ch] text-[15px] leading-relaxed opacity-75">{subtitle}</p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link href={linkHref} className="ip-btn ip-btn-invert group">
                {buttonText}
                <ArrowRight className="ip-arrow h-4 w-4" />
              </Link>
              <Link href={secondaryHref} className="ip-btn ip-btn-ghost-invert">
                {secondaryLabel}
              </Link>
            </div>
          </RevealItem>
        </RevealOnScroll>

        {/* The motif again, at the close. */}
        <div className="mt-16 opacity-80">
          <div className="mb-6 h-px w-full bg-current opacity-20" aria-hidden />
          <SignalStrip
            stages={isRecruiter ? RECRUITER_STAGES : CANDIDATE_STAGES}
            tone={isRecruiter ? "secondary" : "accent"}
            className="max-w-2xl"
          />
        </div>
      </div>
    </section>
  );
}

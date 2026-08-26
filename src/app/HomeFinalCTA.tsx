"use client";

import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { EASE_EXPO_OUT } from "@/components/scroll/motion-config";

export default function HomeFinalCTA({
  persona = "candidate",
}: {
  persona?: "candidate" | "recruiter";
}) {
  const reduced = useReducedMotion();
  const isRecruiter = persona === "recruiter";

  const headline = isRecruiter ? "Hire your next elite engineer." : "Walk in prepared.";
  const subtitle = isRecruiter
    ? "Live coding interviews, async take-homes, and AI screening at batch scale — one workspace for your whole hiring pipeline."
    : "Practice in the same sandbox you'll be interviewed in — then let your work speak for itself with a shareable portfolio.";
  const buttonText = isRecruiter ? "Start Screening Candidates" : "Get Started for Free";
  const linkHref = isRecruiter ? "/login?next=/dashboard" : "/login";
  // On-token gradients: brand accent (candidate) / secondary accent (recruiter).
  const gradientClass = isRecruiter
    ? "bg-gradient-to-r from-secondary to-secondary-soft shadow-secondary/10"
    : "bg-gradient-to-r from-accent to-accent-soft shadow-accent/10";
  // Both accent ramps are light in dark mode and mid-tone in light mode —
  // dark text keeps contrast on both.
  const textClass = "text-[#16181d]";
  const subtextClass = "text-[#16181d]/75";

  const words = headline.split(" ");

  const containerVariants: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  };

  const wordVariants: Variants = {
    hidden: { opacity: 0, y: 32 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: EASE_EXPO_OUT as unknown as [number, number, number, number] },
    },
  };

  const tailVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: EASE_EXPO_OUT as unknown as [number, number, number, number] },
    },
  };

  if (reduced) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className={`rounded-3xl ${gradientClass} p-12 text-center relative overflow-hidden group shadow-2xl transition-all duration-500`}>
          <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className={`text-3xl md:text-4xl font-black ${textClass} mb-4 tracking-tight`}>
              {headline}
            </h2>
            <p className={`${subtextClass} font-medium mb-8 text-lg`}>
              {subtitle}
            </p>
            <Link
              href={linkHref}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-bg text-fg font-bold hover:bg-bg/80 transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
            >
              {buttonText}
              <ArrowRight className="w-5 h-5 animate-pulse" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <div className={`rounded-3xl ${gradientClass} p-12 text-center relative overflow-hidden group shadow-2xl transition-all duration-500`}>
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <motion.h2
            className={`text-3xl md:text-4xl font-black ${textClass} mb-4 tracking-tight`}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={containerVariants}
            aria-label={headline}
            key={headline} // Forces re-render and animation run on persona change
          >
            {words.map((word, i) => (
              <Fragment key={i}>
                <motion.span
                  className="inline-block"
                  variants={wordVariants}
                  aria-hidden
                >
                  {word}
                </motion.span>
                {/* Space lives outside the inline-block so it isn't trimmed. */}
                {i < words.length - 1 ? " " : null}
              </Fragment>
            ))}
          </motion.h2>

          <motion.p
            className={`${subtextClass} font-medium mb-8 text-lg`}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={tailVariants}
            transition={{ delay: words.length * 0.07 + 0.1 } as unknown as undefined}
            key={subtitle}
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={tailVariants}
            transition={{ delay: words.length * 0.07 + 0.25 } as unknown as undefined}
          >
            <Link
              href={linkHref}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-bg text-fg font-bold hover:bg-bg/80 transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
            >
              {buttonText}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

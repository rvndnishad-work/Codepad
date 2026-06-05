"use client";

import Link from "next/link";
import { Fragment, useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { EASE_EXPO_OUT } from "@/components/scroll/motion-config";

export default function HomeFinalCTA() {
  const reduced = useReducedMotion();
  const [persona, setPersona] = useState<"candidate" | "recruiter" | null>(null);

  useEffect(() => {
    // Initial load
    const saved = localStorage.getItem("ipad.persona");
    if (saved === "candidate" || saved === "recruiter") {
      setPersona(saved as "candidate" | "recruiter");
    }

    // Event listener for changes
    const handlePersonaChange = (e: Event) => {
      setPersona((e as CustomEvent).detail);
    };
    window.addEventListener("ipad-persona-change", handlePersonaChange);
    return () => window.removeEventListener("ipad-persona-change", handlePersonaChange);
  }, []);

  const isRecruiter = persona === "recruiter";

  const headline = isRecruiter ? "Hire your next elite engineer." : "Bring your ideas to life.";
  const subtitle = isRecruiter
    ? "Standardize your technical interview pipelines and evaluate candidate coding abilities with isolated sandboxes."
    : "Join thousands of developers building the next generation of web experiments.";
  const buttonText = isRecruiter ? "Start Screening Candidates" : "Get Started for Free";
  const linkHref = isRecruiter ? "/login?next=/dashboard" : "/login";
  const gradientClass = isRecruiter
    ? "bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-indigo-500/10"
    : "bg-gradient-to-r from-accent to-[#FFB800] shadow-accent/10";
  const textClass = isRecruiter ? "text-white" : "text-[#0A0A0A]";
  const subtextClass = isRecruiter ? "text-white/80" : "text-[#0A0A0A]/70";

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

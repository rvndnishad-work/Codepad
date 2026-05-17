"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { EASE_EXPO_OUT } from "@/components/scroll/motion-config";

const HEADLINE = "Bring your ideas to life.";

export default function HomeFinalCTA() {
  const reduced = useReducedMotion();

  // Split the headline into words for the stagger reveal. Word-by-word feels
  // dramatic without going overboard; letter-by-letter is gimmicky and adds
  // a ton of DOM nodes for screen readers to wade through.
  const words = HEADLINE.split(" ");

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

  // Reduced-motion path: render the headline normally, no animation overhead.
  // Visual result is identical to the animated final frame.
  if (reduced) {
    return <StaticVariant />;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <div className="rounded-3xl bg-gradient-to-r from-accent to-[#FFB800] p-12 text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-black text-[#0A0A0A] mb-4 tracking-tight"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={containerVariants}
            aria-label={HEADLINE}
          >
            {words.map((word, i) => (
              <motion.span
                key={i}
                className="inline-block"
                variants={wordVariants}
                aria-hidden
              >
                {word}
                {i < words.length - 1 && " "}
              </motion.span>
            ))}
          </motion.h2>

          <motion.p
            className="text-[#0A0A0A]/70 font-medium mb-8 text-lg"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={tailVariants}
            transition={{ delay: words.length * 0.07 + 0.1 } as unknown as undefined}
          >
            Join thousands of developers building the next generation of web experiments.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={tailVariants}
            transition={{ delay: words.length * 0.07 + 0.25 } as unknown as undefined}
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-bg text-fg font-bold hover:bg-bg/80 transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
            >
              Get Started for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function StaticVariant() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <div className="rounded-3xl bg-gradient-to-r from-accent to-[#FFB800] p-12 text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-[#0A0A0A] mb-4 tracking-tight">
            {HEADLINE}
          </h2>
          <p className="text-[#0A0A0A]/70 font-medium mb-8 text-lg">
            Join thousands of developers building the next generation of web experiments.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-bg text-fg font-bold hover:bg-bg/80 transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
          >
            Get Started for Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

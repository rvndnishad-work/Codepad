"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomeFinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <div className="rounded-3xl bg-gradient-to-r from-accent to-[#FFB800] p-12 text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-[#0A0A0A] mb-4 tracking-tight">
            Bring your ideas to life.
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

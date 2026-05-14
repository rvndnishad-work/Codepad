"use client";

import Link from "next/link";
import { ArrowUpRight, Flame, ArrowRight } from "lucide-react";
import RelativeTime from "@/components/RelativeTime";
import {
  TemplateCardShell,
  CardTitleRow,
} from "@/components/TemplateCardShell";

type Snippet = {
  id: string;
  slug: string;
  title: string;
  template: string;
  author: { name: string | null; image: string | null } | null;
  updatedAt: string;
};

export default function HomeExplore({ featured }: { featured: Snippet[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-accent mb-2 bg-accent/10 px-3 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5 fill-current" />
            Social
          </div>
          <h2 className="text-3xl font-black text-fg tracking-tight">Community Trends</h2>
        </div>
        <Link href="/explore" className="text-sm font-bold text-muted hover:text-fg transition-colors flex items-center gap-2 group">
          Explore all snippets
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {featured.map((s) => {
          return (
            <TemplateCardShell
              key={s.id}
              href={`/play/${s.slug}`}
              templateId={s.template}
            >
              <CardTitleRow>{s.title}</CardTitleRow>
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                <div className="flex items-center gap-1.5 truncate">
                  {s.author?.image ? (
                    <img
                      src={s.author.image}
                      alt=""
                      className="w-4 h-4 rounded-full border border-border shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-surface border border-border shrink-0" />
                  )}
                  <span className="truncate">{s.author?.name ?? "anonymous"}</span>
                </div>
                <span className="text-[10px] font-bold text-muted/40 uppercase tabular-nums shrink-0">
                  <RelativeTime iso={s.updatedAt} />
                </span>
              </div>
            </TemplateCardShell>
          );
        })}
      </div>

      <div className="mt-16 rounded-3xl bg-gradient-to-r from-accent to-[#FFB800] p-12 text-center relative overflow-hidden group">
         <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
         <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-[#0A0A0A] mb-4 tracking-tight">
              Bring your ideas to life.
            </h2>
            <p className="text-[#0A0A0A]/70 font-medium mb-8 text-lg">
              Join thousands of developers building the next generation of web experiments.
            </p>
            <Link href="/login" className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-bg text-fg font-bold hover:bg-bg/80 transition-all transform hover:scale-105 active:scale-95 shadow-2xl">
               Get Started for Free
               <ArrowRight className="w-5 h-5" />
            </Link>
         </div>
      </div>
    </section>
  );
}

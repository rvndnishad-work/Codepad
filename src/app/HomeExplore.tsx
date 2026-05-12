"use client";

import Link from "next/link";
import { templateIcon, TemplateLogo } from "@/lib/icons";
import { ArrowUpRight, Flame, Globe, User, ArrowRight } from "lucide-react";
import RelativeTime from "@/components/RelativeTime";
import { templatesById } from "@/lib/templates";

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featured.map((s) => {
          const meta = templateIcon[s.template];
          const accentColor = meta?.color ?? "var(--accent)";
          const tpl = templatesById[s.template];
          
          return (
            <Link
              key={s.id}
              href={`/play/${s.slug}`}
              className="group relative flex items-center gap-5 p-4 rounded-[2rem] border border-border bg-surface hover:bg-elevated transition-all duration-500 hover:scale-[1.02] hover:rotate-1 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {/* Background Glow */}
              <div
                className="absolute -left-10 -top-10 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-700"
                style={{ background: accentColor }}
              />

              {/* Icon Stage */}
              <div className="relative w-[32%] aspect-square shrink-0 flex items-center justify-center">
                <div 
                  className="absolute inset-0 rounded-[30%_70%_70%_30%_/_30%_30%_70%_70%] animate-[blobby_10s_ease-in-out_infinite] opacity-20 group-hover:opacity-40 transition-all duration-700 blur-[2px] border border-white/10"
                  style={{ background: accentColor }}
                />
                <div className="relative w-[50%] h-[50%] flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                  <TemplateLogo id={s.template} className="w-full h-full drop-shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base font-black text-fg tracking-tight group-hover:text-accent transition-colors leading-tight truncate">
                    {s.title}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-muted/30 group-hover:text-fg group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted mb-1 truncate">
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

                <div className="flex items-center justify-between mt-auto pt-1">
                   <div 
                      className="text-[11px] font-black uppercase tracking-wider transition-colors"
                      style={{ color: accentColor }}
                    >
                      {tpl?.title ?? s.template}
                    </div>
                   <span className="text-[10px] font-bold text-muted/40 uppercase tabular-nums">
                     <RelativeTime iso={s.updatedAt} />
                   </span>
                </div>
              </div>
            </Link>
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

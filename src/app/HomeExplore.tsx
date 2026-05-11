"use client";

import Link from "next/link";
import { TemplateLogo } from "@/lib/icons";
import { ArrowUpRight, Flame, Globe, User, ArrowRight } from "lucide-react";
import RelativeTime from "@/components/RelativeTime";

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
        {featured.map((s) => (
          <Link
            key={s.id}
            href={`/play/${s.slug}`}
            className="group relative rounded-3xl border border-border bg-surface p-6 hover:border-border-strong transition-all shadow-xl"
          >
            <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
               <TemplateLogo id={s.template} size={80} />
            </div>
            
            <div className="flex items-center justify-between mb-6">
               <div className="w-12 h-12 rounded-2xl bg-panel border border-border flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TemplateLogo id={s.template} size={24} />
               </div>
               <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface border border-border text-[10px] font-bold text-muted uppercase">
                  <Globe className="w-3 h-3" />
                  Public
               </div>
            </div>

            <h3 className="text-xl font-bold text-fg mb-2 group-hover:text-accent transition-colors line-clamp-1">
              {s.title}
            </h3>

            <div className="flex items-center gap-3 mt-8 pt-4 border-t border-border">
               <div className="w-6 h-6 rounded-full bg-surface overflow-hidden ring-2 ring-bg">
                  {s.author?.image ? (
                    <img src={s.author.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-accent/20 flex items-center justify-center">
                       <User className="w-3 h-3 text-fg/40" />
                    </div>
                  )}
               </div>
               <span className="text-xs font-medium text-muted truncate flex-1">{s.author?.name ?? "Anonymous"}</span>
               <span className="text-[10px] font-bold text-muted/40 uppercase tabular-nums">
                 <RelativeTime iso={s.updatedAt} />
               </span>
            </div>
          </Link>
        ))}
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

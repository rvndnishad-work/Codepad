"use client";

import Link from "next/link";
import { ArrowUpRight, Flame, ArrowRight } from "lucide-react";
import RelativeTime from "@/components/RelativeTime";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";
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
      <RevealOnScroll className="flex items-end justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-accent mb-2 bg-accent/10 px-3 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5 fill-current" />
            Discovery
          </div>
          <h2 className="text-3xl font-black text-fg tracking-tight">Explore Trends</h2>
        </div>
        <Link href="/explore" className="text-sm font-bold text-muted hover:text-fg transition-colors flex items-center gap-2 group">
          Explore all snippets
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </RevealOnScroll>

      <RevealOnScroll
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        stagger={0.06}
      >
        {featured.map((s) => (
          <RevealItem key={s.id}>
            <TemplateCardShell href={`/play/${s.slug}`} templateId={s.template}>
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
          </RevealItem>
        ))}
      </RevealOnScroll>


    </section>
  );
}

"use client";

import { Cpu, Globe, ShieldCheck, Zap } from "lucide-react";
import RevealOnScroll, { RevealItem } from "@/components/scroll/RevealOnScroll";

const BRANDS = [
  { name: "Next.js", icon: Globe, color: "text-fg" },
  { name: "Vercel", icon: Zap, color: "text-fg" },
  { name: "Prisma", icon: ShieldCheck, color: "text-blue-500" },
  { name: "Sandpack", icon: Cpu, color: "text-accent" },
];

export default function TrustLogos() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 overflow-hidden border-b border-border">
      <RevealOnScroll
        className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4"
        stagger={0.06}
      >
        <RevealItem>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted shrink-0">
            Built with industry-leading technology
          </div>
        </RevealItem>
        
        <RevealItem>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {BRANDS.map((brand) => (
              <div 
                key={brand.name} 
                className="flex items-center gap-2.5 opacity-40 hover:opacity-100 transition-opacity grayscale hover:grayscale-0 group cursor-default"
              >
                <brand.icon className={`w-5 h-5 ${brand.color} group-hover:scale-110 transition-transform`} />
                <span className="text-sm font-black tracking-tight text-fg">{brand.name}</span>
              </div>
            ))}
          </div>
        </RevealItem>
      </RevealOnScroll>
    </section>
  );
}

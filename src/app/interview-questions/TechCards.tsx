import Link from "next/link";
import {
  Atom,
  Hexagon,
  Braces,
  FileType2,
  Binary,
  Network,
  TerminalSquare,
  Database,
  Shield,
  Triangle,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { TECHNOLOGIES } from "@/lib/interview-questions/shared";

/** Per-technology presentation: icon, accent color + a short dev-facing tagline. */
const META: Record<string, { icon: LucideIcon; tint: string; tagline: string }> = {
  reactjs: { icon: Atom, tint: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", tagline: "Hooks, rendering & state" },
  nodejs: { icon: Hexagon, tint: "text-green-400 bg-green-500/10 border-green-500/20", tagline: "Event loop, streams & APIs" },
  javascript: { icon: Braces, tint: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", tagline: "Closures, async & the core" },
  angular: { icon: Shield, tint: "text-red-400 bg-red-500/10 border-red-500/20", tagline: "Components, DI & RxJS" },
  vuejs: { icon: Triangle, tint: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", tagline: "Reactivity & composition API" },
  typescript: { icon: FileType2, tint: "text-blue-400 bg-blue-500/10 border-blue-500/20", tagline: "Types, generics & inference" },
  dsa: { icon: Binary, tint: "text-purple-400 bg-purple-500/10 border-purple-500/20", tagline: "Algorithms & data structures" },
  "system-design": { icon: Network, tint: "text-orange-400 bg-orange-500/10 border-orange-500/20", tagline: "Scale, storage & trade-offs" },
  python: { icon: TerminalSquare, tint: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", tagline: "Idioms, data & internals" },
  sql: { icon: Database, tint: "text-sky-400 bg-sky-500/10 border-sky-500/20", tagline: "Joins, indexes & queries" },
};

const FALLBACK = { icon: TerminalSquare, tint: "text-accent bg-accent/10 border-accent/20", tagline: "Interview questions" };

export default function TechCards({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {TECHNOLOGIES.map((t) => {
        const m = META[t.slug] ?? FALLBACK;
        const Icon = m.icon;
        const count = counts[t.slug] ?? 0;
        return (
          <Link
            key={t.slug}
            href={`/interview-questions/${t.slug}`}
            className="group relative p-5 rounded-2xl border border-border bg-surface/40 hover:bg-surface/70 hover:border-accent/40 transition-all overflow-hidden"
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-accent/10" />
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${m.tint}`}>
                <Icon className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all" />
            </div>
            <div className="mt-4">
              <div className="font-extrabold text-base group-hover:text-accent transition-colors">{t.label}</div>
              <div className="text-[11px] text-muted mt-0.5">{m.tagline}</div>
            </div>
            <div className="mt-3 text-xs font-bold text-muted">
              {count > 0 ? `${count} question${count === 1 ? "" : "s"}` : "Coming soon"}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

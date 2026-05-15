import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TemplatePicker from "@/components/TemplatePicker";
import { Box, Sparkles, Zap, Shield, Search } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Templates | Interviewpad",
  description: "Browse 16+ pre-wired templates for your next project. From core languages to complex ecosystem variants.",
};

export default async function TemplatesPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;

  let welcomeData: {
    name: string | null;
    image: string | null;
    snippetCount: number;
    recent: { slug: string; title: string; template: string } | null;
  } | null = null;

  if (userId) {
    const [count, recent] = await Promise.all([
      prisma.snippet.count({ where: { userId } }),
      prisma.snippet.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { slug: true, title: true, template: true },
      }),
    ]);
    welcomeData = {
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
      snippetCount: count,
      recent,
    };
  }

  return (
    <div className="bg-bg min-h-screen pb-24">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-border bg-surface/30 pt-20 pb-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[80%] bg-accent/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[80%] bg-blue-500/5 blur-[120px] rounded-full" />
        </div>

        <div className="mx-auto max-w-6xl px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest mb-6">
            <Box className="w-3.5 h-3.5" />
            Starter Kits
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-fg tracking-tight mb-6">
            The Full <span className="text-accent">Library</span>
          </h1>
          <p className="text-muted text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Ready-to-use environments for every workflow. Zero config, high performance, 
            and pre-wired with the best DX.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-bg/50 backdrop-blur-sm">
              <Zap className="w-5 h-5 text-amber-500" />
              <div className="text-left">
                <div className="text-xs font-black text-fg">Instant Boot</div>
                <div className="text-[10px] text-muted">Ready in &lt;1s</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-bg/50 backdrop-blur-sm">
              <Shield className="w-5 h-5 text-emerald-500" />
              <div className="text-left">
                <div className="text-xs font-black text-fg">Pre-configured</div>
                <div className="text-[10px] text-muted">Batteries included</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-bg/50 backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <div className="text-left">
                <div className="text-xs font-black text-fg">Modern Tech</div>
                <div className="text-[10px] text-muted">Latest versions</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 mt-16">
        <TemplatePicker 
          welcome={welcomeData} 
          featured={[]} 
          hideHero 
        />
      </div>

      {/* Footer CTA */}
      <div className="mx-auto max-w-4xl px-4 mt-24">
        <div className="rounded-3xl border border-border bg-surface p-8 md:p-12 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h2 className="text-2xl font-black text-fg mb-4 relative z-10">Can&apos;t find what you need?</h2>
          <p className="text-muted text-sm mb-8 max-w-md mx-auto relative z-10">
            We&apos;re constantly adding new templates. If you have a specific stack in mind, 
            reach out and we&apos;ll see what we can do.
          </p>
          <div className="flex items-center justify-center gap-4 relative z-10">
            <button className="px-6 py-2.5 rounded-xl bg-fg text-bg text-sm font-bold hover:bg-fg/90 transition-all active:scale-95">
              Request Template
            </button>
            <button className="px-6 py-2.5 rounded-xl border border-border bg-bg text-sm font-bold text-muted hover:text-fg hover:bg-elevated transition-all">
              View Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

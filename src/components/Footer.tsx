import Link from "next/link";
import { Github, Twitter, Youtube, ShieldCheck, Cpu, Zap, Globe, Lock } from "lucide-react";
import { LogoMark } from "./Logo";

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-bg pt-16 pb-8 overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent opacity-[0.02] blur-[100px] pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <LogoMark size={32} className="drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.35)] transition-transform group-hover:scale-110" />
              <div className="flex flex-col leading-none">
                 <span className="font-extrabold text-lg tracking-tight text-fg">
                   Interview<span className="text-accent font-medium">pad</span>
                 </span>
                 <span className="text-[9px] font-bold text-accent uppercase tracking-[0.3em] mt-0.5">Pro Sandbox</span>
              </div>
            </Link>
            <p className="text-muted text-sm leading-relaxed max-w-xs">
              The next-generation JavaScript playground. Built for developers who demand speed, precision, and the ultimate "Pro" aesthetic.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-accent hover:border-accent/30 transition-all">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-accent hover:border-accent/30 transition-all">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-surface border border-border text-muted hover:text-accent hover:border-accent/30 transition-all">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-accent mb-6">Product</h4>
            <ul className="space-y-4 text-sm font-bold">
              <li><Link href="/playgrounds" className="text-muted hover:text-fg transition-colors">Playgrounds</Link></li>
              <li><Link href="/explore" className="text-muted hover:text-fg transition-colors">Explore</Link></li>
              <li><Link href="/play" className="text-muted hover:text-fg transition-colors">New Sandbox</Link></li>
              <li><Link href="/dashboard" className="text-muted hover:text-fg transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          {/* Infrastructure Column */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-accent mb-6">Security</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm text-muted">
                <Lock className="w-4 h-4 text-emerald-500/60" />
                <span>Isolated Containers</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted">
                <ShieldCheck className="w-4 h-4 text-emerald-500/60" />
                <span>Local-first Runtime</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted">
                <Globe className="w-4 h-4 text-emerald-500/60" />
                <span>Edge Optimized</span>
              </li>
            </ul>
          </div>

          {/* Compliance & Trust Column */}
          <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-center gap-4 hover:border-emerald-500/20 transition-all">
             <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <div className="flex flex-col">
                   <span className="text-sm font-black text-fg leading-none">SOC2 Type II</span>
                   <span className="text-[9px] font-bold uppercase tracking-widest text-muted/40">In Progress / Compliant</span>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-emerald-400" />
                <div className="flex flex-col">
                   <span className="text-sm font-black text-fg leading-none">GDPR Compliant</span>
                   <span className="text-[9px] font-bold uppercase tracking-widest text-muted/40">100% Data Protection</span>
                </div>
             </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-muted/40 uppercase tracking-[0.1em]">
          <p>© {new Date().getFullYear()} INTERVIEWPAD PRO. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6">
             <Link href="/privacy" className="hover:text-fg transition-colors">Privacy Policy</Link>
             <Link href="/terms" className="hover:text-fg transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

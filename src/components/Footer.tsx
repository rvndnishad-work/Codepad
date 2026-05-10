import Link from "next/link";
import { Github, Twitter, Youtube, ShieldCheck, Cpu, Zap, Globe, Lock } from "lucide-react";
import { LogoMark } from "./Logo";

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.05] bg-[#050505] pt-16 pb-8 overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#FFE600]/20 to-transparent" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#FFE600] opacity-[0.02] blur-[100px] pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-[#FFE600] grid place-items-center shadow-[0_0_20px_rgba(255,230,0,0.3)] transition-transform group-hover:scale-110">
                 <LogoMark size={20} className="text-black" />
              </div>
              <div className="flex flex-col leading-none">
                 <span className="font-black text-lg tracking-tighter text-white">Interviewpad</span>
                 <span className="text-[9px] font-bold text-[#FFE600] uppercase tracking-[0.3em]">Pro Sandbox</span>
              </div>
            </Link>
            <p className="text-white/40 text-xs leading-relaxed max-w-xs">
              The next-generation JavaScript playground. Built for developers who demand speed, precision, and the ultimate "Pro" aesthetic.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-[#FFE600] hover:border-[#FFE600]/30 transition-all">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-[#FFE600] hover:border-[#FFE600]/30 transition-all">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-[#FFE600] hover:border-[#FFE600]/30 transition-all">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFE600] mb-6">Product</h4>
            <ul className="space-y-4 text-xs font-bold">
              <li><Link href="/" className="text-white/40 hover:text-white transition-colors">Templates</Link></li>
              <li><Link href="/explore" className="text-white/40 hover:text-white transition-colors">Explore</Link></li>
              <li><Link href="/play" className="text-white/40 hover:text-white transition-colors">New Sandbox</Link></li>
              <li><Link href="/dashboard" className="text-white/40 hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          {/* Infrastructure Column */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFE600] mb-6">Security</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-[11px] text-white/40">
                <Lock className="w-3.5 h-3.5 text-emerald-500/60" />
                <span>Isolated Containers</span>
              </li>
              <li className="flex items-center gap-3 text-[11px] text-white/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/60" />
                <span>Local-first Runtime</span>
              </li>
              <li className="flex items-center gap-3 text-[11px] text-white/40">
                <Globe className="w-3.5 h-3.5 text-emerald-500/60" />
                <span>Edge Optimized</span>
              </li>
            </ul>
          </div>

          {/* Stats Column */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 flex flex-col justify-center gap-4">
             <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-[#FFE600]" />
                <div className="flex flex-col">
                   <span className="text-xl font-black text-white leading-none">0ms</span>
                   <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Cold Start</span>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-[#FFE600]" />
                <div className="flex flex-col">
                   <span className="text-xl font-black text-white leading-none">100%</span>
                   <span className="text-[8px] font-black uppercase tracking-widest text-white/20">V8 Performance</span>
                </div>
             </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-bold text-white/20 uppercase tracking-[0.1em]">
          <p>© {new Date().getFullYear()} INTERVIEWPAD PRO. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6">
             <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
             <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

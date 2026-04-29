import Link from "next/link";
import { Github, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg/60 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-fg tracking-tight">Codepad</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-border">
            beta
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3 h-3 text-emerald-400/80" />
            Code runs in a sandboxed iframe — never on our servers
          </span>
        </div>
        <nav className="flex items-center gap-4 flex-wrap justify-center">
          <Link href="/" className="hover:text-fg transition">
            Templates
          </Link>
          <Link href="/explore" className="hover:text-fg transition">
            Explore
          </Link>
          <Link href="/privacy" className="hover:text-fg transition">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-fg transition">
            Terms
          </Link>
          <a
            href="https://github.com/anthropics/codepad"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 hover:text-fg transition"
            title="View source on GitHub"
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </nav>
      </div>
    </footer>
  );
}

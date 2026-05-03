"use client";

import { Newspaper, Keyboard, Info, ExternalLink, MessageSquare } from "lucide-react";

const NEWS = [
  { title: "Monaco Editor Intelligence Boost", date: "May 2", href: "#" },
  { title: "New Cobalt2 Theme Support", date: "Apr 28", href: "#" },
  { title: "Better JSX highlighting for React", date: "Apr 25", href: "#" },
];

const SHORTCUTS = [
  { keys: ["Ctrl", "S"], label: "Save snippet" },
  { keys: ["Ctrl", "Enter"], label: "Run code" },
  { keys: ["Ctrl", "P"], label: "Search files" },
];

export default function DashboardSidebar() {
  return (
    <div className="space-y-6">
      {/* News Section */}
      <div className="rounded-3xl border border-border bg-panel p-6">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <Newspaper className="w-4 h-4 text-[#FFE600]" />
          Platform News
        </h3>
        <div className="space-y-4">
          {NEWS.map((item, i) => (
            <a key={i} href={item.href} className="group block">
              <div className="text-[10px] text-[#FFE600] font-bold uppercase mb-0.5 tracking-wider">{item.date}</div>
              <div className="text-sm text-subtle group-hover:text-white transition-colors flex items-center justify-between">
                {item.title}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Shortcuts Section */}
      <div className="rounded-3xl border border-border bg-panel p-6">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <Keyboard className="w-4 h-4 text-[#FFE600]" />
          Quick Shortcuts
        </h3>
        <div className="space-y-3">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-muted">{s.label}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[9px] font-mono text-white/60">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Support Section */}
      <div className="rounded-3xl border border-border bg-[#FFE600]/5 p-6 border-[#FFE600]/20">
        <h3 className="text-sm font-semibold text-[#FFE600] flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4" />
          Need Help?
        </h3>
        <p className="text-xs text-subtle leading-relaxed mb-4">
          Join our Discord community or check the documentation for pro tips.
        </p>
        <button className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-all">
          Join Community
        </button>
      </div>
    </div>
  );
}

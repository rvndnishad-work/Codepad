"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Link2, Check, Twitter } from "lucide-react";
import { toast } from "sonner";

export default function ShareButton({
  title,
  url,
  orientation = "horizontal",
}: {
  title: string;
  url?: string;
  orientation?: "horizontal" | "vertical";
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function resolveUrl(): string {
    if (url) return url;
    if (typeof window !== "undefined") return window.location.href;
    return "";
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resolveUrl());
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  function shareTwitter() {
    const u = encodeURIComponent(resolveUrl());
    const t = encodeURIComponent(title);
    window.open(
      `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      "_blank",
      "noopener,noreferrer",
    );
    setOpen(false);
  }

  const triggerClass =
    orientation === "vertical"
      ? "w-10 h-10 rounded-lg border border-border bg-surface hover:bg-elevated text-fg/70 hover:text-fg flex items-center justify-center transition"
      : "flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface hover:bg-elevated text-fg/70 hover:text-fg text-sm font-bold transition";

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Share this post"
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClass}
      >
        <Share2 className="w-4 h-4" />
        {orientation === "horizontal" && <span className="hidden sm:inline">Share</span>}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-30 w-44 rounded-xl border border-border bg-surface shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 ${
            orientation === "vertical" ? "left-full ml-2 top-0" : "right-0 mt-2"
          }`}
        >
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-fg/80 hover:bg-elevated transition"
            role="menuitem"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Link2 className="w-4 h-4" />}
            Copy link
          </button>
          <button
            onClick={shareTwitter}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-fg/80 hover:bg-elevated transition border-t border-border"
            role="menuitem"
          >
            <Twitter className="w-4 h-4" />
            Share on X
          </button>
        </div>
      )}
    </div>
  );
}

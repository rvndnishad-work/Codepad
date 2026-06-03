"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Small island component so the otherwise-server-rendered docs page can
 * include copy-to-clipboard buttons without becoming fully client-side.
 */
export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    void navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard.");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleClick}
      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border hover:bg-elevated text-fg text-[10px] font-bold uppercase tracking-wider transition"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

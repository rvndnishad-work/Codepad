"use client";

import { useState } from "react";
import { Link as LinkIcon, Check } from "lucide-react";
import { toast } from "sonner";

export default function CopyLinkButton({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      // Local copy helper using window/navigator
      const shareUrl = `${window.location.origin}${inviteUrl.substring(inviteUrl.indexOf("/interview"))}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Practice invite link copied!", { description: "Share this link with your colleague to join a live voice call." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link.");
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`p-2.5 rounded-xl border transition flex items-center justify-center shrink-0 ${
        copied 
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
          : "bg-surface border-border text-muted hover:text-fg hover:bg-panel"
      }`}
      title="Copy mock colleague invite link"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
    </button>
  );
}

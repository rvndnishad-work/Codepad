"use client";

import { useState } from "react";
import { Link as LinkIcon, Check } from "lucide-react";
import { toast } from "sonner";

export default function CopyLinkButton({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const shareUrl = `${window.location.origin}${inviteUrl.substring(inviteUrl.indexOf("/interview"))}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Invite link copied", {
        description: "Share it with anyone you want to join this interview room.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link", {
        description: "Your browser blocked clipboard access. Copy the URL from the address bar instead.",
      });
    }
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Invite link copied" : "Copy invite link"}
      className={`h-10 w-10 rounded-xl border transition-all duration-200 flex items-center justify-center shrink-0 hover:scale-[1.02] active:scale-[0.98] ${
        copied
          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
          : "bg-bg border-border text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 hover:border-sky-500/50 hover:bg-sky-500/5"
      }`}
      title="Copy invite link"
    >
      {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
    </button>
  );
}

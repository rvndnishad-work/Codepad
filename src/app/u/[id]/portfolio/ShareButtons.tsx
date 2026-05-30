"use client";

import { useEffect, useState } from "react";
import { Linkedin, Twitter, Link as LinkIcon, Check, Printer } from "lucide-react";

type Props = {
  name: string;
  userId: string;
  badgeCount: number;
  challengeCount: number;
};

export default function ShareButtons({ name, userId, badgeCount, challengeCount }: Props) {
  // SSR-safe: hydrate the URL on mount so share intents always carry the
  // canonical current origin (preview, prod, local — all just work).
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/u/${userId}/portfolio`);
  }, [userId]);

  const displayName = name || "this developer";
  const shareText =
    `Check out ${displayName}'s verified developer portfolio on Interviewpad — ` +
    `${badgeCount} badge${badgeCount === 1 ? "" : "s"}, ` +
    `${challengeCount} challenge${challengeCount === 1 ? "" : "s"} solved.`;

  // LinkedIn pulls title/description/image from the page's OG meta — it
  // doesn't honor extra text params. So url-only is the correct call here.
  const linkedinHref = shareUrl
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    : "#";

  const twitterHref = shareUrl
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    : "#";

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard may be unavailable (insecure context, denied permission);
      // fall back to selecting the URL via a transient prompt.
      window.prompt("Copy this link:", shareUrl);
    }
  }

  const ready = shareUrl.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={ready ? linkedinHref : undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!ready}
        aria-label="Share portfolio on LinkedIn"
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0a66c2] hover:bg-[#0a5cb0] text-white text-xs font-bold transition shadow-md ${
          ready ? "cursor-pointer" : "opacity-60 pointer-events-none"
        }`}
      >
        <Linkedin className="w-3.5 h-3.5" />
        LinkedIn
      </a>

      <a
        href={ready ? twitterHref : undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!ready}
        aria-label="Share portfolio on X (Twitter)"
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold transition shadow-md border border-zinc-700 ${
          ready ? "cursor-pointer" : "opacity-60 pointer-events-none"
        }`}
      >
        <Twitter className="w-3.5 h-3.5" />
        Post on X
      </a>

      <button
        type="button"
        onClick={copyLink}
        disabled={!ready}
        aria-label="Copy public portfolio link"
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border hover:bg-elevated hover:border-border-strong text-xs font-bold text-fg transition shadow-md ${
          ready ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
        }`}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            Copied
          </>
        ) : (
          <>
            <LinkIcon className="w-3.5 h-3.5" />
            Copy link
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        aria-label="Print or save portfolio as PDF"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border hover:bg-elevated hover:border-border-strong text-xs font-bold text-fg transition shadow-md cursor-pointer"
      >
        <Printer className="w-3.5 h-3.5" />
        Print (PDF)
      </button>
    </div>
  );
}

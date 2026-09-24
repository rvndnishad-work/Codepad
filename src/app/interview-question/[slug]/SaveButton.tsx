"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { isSaved, toggleSaved, type SavedQuestion } from "@/lib/interview-questions/saved";

interface SaveButtonProps {
  question: Omit<SavedQuestion, "savedAt">;
  saved?: boolean;
  onClick?: () => void;
  /** Dark glass styling for use over cinematic heroes. */
  tone?: "default" | "dark";
}

/** Save / unsave a question for later (localStorage-backed / database-synced). */
export default function SaveButton({ question, saved: controlledSaved, onClick, tone = "default" }: SaveButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (controlledSaved !== undefined) return;
    const check = isSaved(question.slug);
    setTimeout(() => setSaved(check), 0);
  }, [question.slug, controlledSaved]);

  const displaySaved = controlledSaved !== undefined ? controlledSaved : saved;

  const handlePress = () => {
    if (onClick) {
      onClick();
    } else {
      setSaved(toggleSaved(question));
    }
  };

  return (
    <button
      type="button"
      onClick={handlePress}
      aria-pressed={displaySaved}
      title="Shortcut: S"
      className={`inline-flex items-center gap-2 border text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${
        tone === "dark" ? "h-11 rounded-full px-4 backdrop-blur-md" : "h-10 rounded-xl px-4"
      } ${
        displaySaved
          ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/15"
          : tone === "dark"
            ? "border-white/[0.14] bg-white/[0.06] text-white/85 hover:border-white/30 hover:bg-white/[0.1] hover:text-white"
            : "border-border text-muted hover:border-border-strong hover:text-fg"
      }`}
    >
      {displaySaved ? <BookmarkCheck className="h-4 w-4" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />}
      {displaySaved ? "Saved" : "Save"}
    </button>
  );
}


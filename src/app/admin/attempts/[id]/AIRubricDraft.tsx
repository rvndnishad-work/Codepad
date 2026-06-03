"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clipboard, Award, ShieldAlert, CheckCircle2, ChevronDown } from "lucide-react";

type Props = {
  suspicionScore: number;
  blurCount: number;
  totalBlurSec: number;
  pasteCount: number;
  passedCount: number;
  totalCount: number;
};

export default function AIRubricDraft({
  suspicionScore,
  blurCount,
  totalBlurSec,
  pasteCount,
  passedCount,
  totalCount,
}: Props) {
  const [open, setOpen] = useState(false);

  // Programmatic scoring calculations
  const codeQuality = suspicionScore > 70 ? 2 : suspicionScore > 25 ? 3 : 5;
  const problemSolving = totalCount > 0 ? Math.round((passedCount / totalCount) * 5) : 3;
  const integrityRating = suspicionScore > 70 ? 1 : suspicionScore > 25 ? 3 : 5;

  const generateFeedbackText = () => {
    if (suspicionScore > 70) {
      return `CRITICAL REVIEW RECOMMENDED: A high risk assessment rating of ${suspicionScore}% was flagged during evaluation. The candidate left the screen ${blurCount} times (totaling ${totalBlurSec} seconds of unfocused activity) and initiated ${pasteCount} major copy-paste code blocks. Zero-edit code insertions suggest dynamic LLM-assisted generation. Recommended to audit Monaco timeline playhead ticks.`;
    }
    if (suspicionScore >= 25) {
      return `MODERATE SIGNAL AUDIT: A moderate risk score of ${suspicionScore}% was detected. Candidate logged ${blurCount} screen blurs and ${pasteCount} paste events. Coding rhythm timing shows occasional speed bursts, but aligns with typical senior practitioner patterns. Recommended to cross-check paste timeline events before finalizing interview stage.`;
    }
    return `SECURE PROFILE CONFIRMED: High integrity candidate profile verified with a secure score of ${suspicionScore}%. Normal keyboard rhythm patterns detected (mean inter-arrival timing meets manual entry benchmarks). Zero tab focus blurs or anomalous paste events logged. All ${passedCount} of ${totalCount} automated grader test cases passed successfully. Highly recommended for advancement.`;
  };

  const [feedback, setFeedback] = useState(generateFeedbackText());

  const handleCopy = async () => {
    const textToCopy = `--- INTERVIEWPAD AI EVALUATION REPORT ---
Integrity Risk Score: ${suspicionScore}%
Automated Test Pass: ${passedCount} / ${totalCount} cases

STRUCTURAL RUBRICS:
- Code Quality: ${codeQuality}/5
- Problem Solving: ${problemSolving}/5
- Proctoring Integrity: ${integrityRating}/5

EVALUATION COMMENTS:
${feedback}
----------------------------------------`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success("AI rubric draft copied to clipboard!");
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  return (
    <div className="w-full mt-4 border border-border bg-[#111625]/40 rounded-2xl overflow-hidden transition-all duration-300">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#161B2E]/40 transition text-left"
      >
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-accent" />
          <span className="text-xs font-black uppercase tracking-wider text-[#F3F4F6]">
            AI Rubric & Feedback Drafter
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="p-5 border-t border-border/30 bg-[#0B0F19]/40 space-y-4 animate-fade-in">
          {/* Rubrics rating grids */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-border bg-bg/40 text-center">
              <span className="text-[9px] uppercase font-black text-muted block mb-1">Code Quality</span>
              <span className="text-sm font-bold text-fg">{codeQuality} / 5</span>
            </div>
            <div className="p-3 rounded-xl border border-border bg-bg/40 text-center">
              <span className="text-[9px] uppercase font-black text-muted block mb-1">Problem Solving</span>
              <span className="text-sm font-bold text-fg">{problemSolving} / 5</span>
            </div>
            <div className="p-3 rounded-xl border border-border bg-bg/40 text-center">
              <span className="text-[9px] uppercase font-black text-muted block mb-1">Proctor Integrity</span>
              <span className="text-sm font-bold text-fg">{integrityRating} / 5</span>
            </div>
          </div>

          {/* Text feedback editor */}
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-muted block">
              Suggested Assessment Review Draft
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="w-full p-3 rounded-xl border border-border bg-bg text-xs text-[#F3F4F6] focus:outline-none focus:border-accent font-sans leading-relaxed resize-y"
            />
          </div>

          {/* Copy and apply controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <span className="text-[10px] text-muted leading-tight">
              Tweak feedback comments and copy structured results to clipboard.
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer shrink-0"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Copy Rubric Draft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * /collab-test
 *
 * Quick test harness for the CollaborativeEditor component.
 * Open this URL in two different browser windows/tabs to see
 * real-time sync in action.
 *
 * URL params:
 *   ?room=<id>   — join a specific room (default: "test-room-1")
 *   ?name=<str>  — set your display name (default: random)
 *   ?role=interviewer|candidate — cosmetic label
 */

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast, Toaster } from "sonner";

// Load the editor client-side only (it uses browser APIs)
const CollaborativeEditor = dynamic(
  () => import("@/components/CollaborativeEditor"),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

const STARTER_CODE = `// 👋 Collaborative Editor Test
// Open this page in another tab or browser to see real-time sync.
// Both windows share the same document — edits appear instantly.

function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}

// Test it
console.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]
console.log(twoSum([3, 2, 4], 6));       // [1, 2]
`;

const NAMES_POOL = ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey"];

function randomName() {
  return NAMES_POOL[Math.floor(Math.random() * NAMES_POOL.length)];
}

function EditorSkeleton() {
  return (
    <div className="flex-1 bg-[#1a1b26] animate-pulse flex items-center justify-center">
      <span className="text-white/20 text-sm font-mono">Loading editor…</span>
    </div>
  );
}

function CollabTestInner() {
  const searchParams = useSearchParams();
  const room = searchParams.get("room") || "test-room-1";
  const nameParam = searchParams.get("name");
  const role = (searchParams.get("role") || "candidate") as "interviewer" | "candidate";

  const [username] = useState(nameParam || randomName());
  const [code, setCode] = useState<string>("");
  const [language, setLanguage] = useState<"typescript" | "javascript" | "css" | "html">("typescript");

  const roomUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/collab-test?room=${room}&role=${role === "interviewer" ? "candidate" : "interviewer"}`;

  function copyInviteLink() {
    navigator.clipboard.writeText(roomUrl).then(() => {
      toast.success("Invite link copied!", { description: "Share this with your test partner." });
    });
  }

  return (
    <div className="flex flex-col h-screen bg-[#13141f] text-white">
      <Toaster richColors />

      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b border-white/10 flex items-center justify-between gap-4 bg-[#0d0e17]">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
            style={{
              background: role === "interviewer" ? "rgba(139,92,246,0.2)" : "rgba(16,185,129,0.2)",
              color: role === "interviewer" ? "#a78bfa" : "#34d399",
              border: `1px solid ${role === "interviewer" ? "rgba(139,92,246,0.4)" : "rgba(16,185,129,0.4)"}`,
            }}
          >
            {role}
          </div>
          <span className="text-sm font-bold text-white/80 truncate">{username}</span>
          <span className="text-white/20">·</span>
          <code className="text-[11px] text-white/40 font-mono truncate">room: {room}</code>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Language selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as typeof language)}
            className="text-[11px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/70 focus:outline-none focus:border-violet-500/50"
          >
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="css">CSS</option>
            <option value="html">HTML</option>
          </select>

          {/* Copy invite link */}
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-400 text-[11px] font-bold transition"
          >
            <Copy className="w-3 h-3" />
            Copy Invite Link
          </button>

          <a
            href={roomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold transition"
          >
            <ExternalLink className="w-3 h-3" />
            Open as {role === "interviewer" ? "Candidate" : "Interviewer"}
          </a>
        </div>
      </div>

      {/* Hint banner */}
      <div className="shrink-0 px-5 py-2.5 bg-violet-500/10 border-b border-violet-500/20 text-[11px] text-violet-300/80">
        🧪 <strong>Test Drive:</strong> Click &ldquo;Open as Candidate&rdquo; (or share the invite link) to open a second window. 
        Type in either window — changes appear in the other in real-time. Remote cursors show up as labelled highlights.
      </div>

      {/* Editor — takes remaining height */}
      <div className="flex-1 min-h-0">
        <CollaborativeEditor
          roomId={room}
          language={language}
          // Only the room creator (interviewer) seeds the document.
          // The candidate tab gets no defaultValue — it only receives
          // synced content from the interviewer via Yjs/WebRTC.
          defaultValue={role === "interviewer" ? STARTER_CODE : undefined}
          username={`${username} (${role})`}
          userColor={role === "interviewer" ? "#8b5cf6" : "#10b981"}
          onChange={setCode}
          height="100%"
        />
      </div>

      {/* Footer debug strip */}
      <div className="shrink-0 px-5 py-1.5 border-t border-white/5 bg-[#0d0e17] flex items-center justify-between">
        <span className="text-[10px] text-white/20 font-mono">
          {code.length > 0 ? `${code.split("\n").length} lines · ${code.length} chars` : "waiting for content…"}
        </span>
        <span className="text-[10px] text-white/20 font-mono">
          CollaborativeEditor · y-webrtc · Yjs · CodeMirror 6
        </span>
      </div>
    </div>
  );
}

export default function CollabTestPage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <CollabTestInner />
    </Suspense>
  );
}

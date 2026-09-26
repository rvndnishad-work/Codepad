"use client";

/**
 * The room's tool registry: one entry per tool id, mapping it to its UI.
 * Labels, descriptions and default formats live with the id in
 * src/lib/interview/tools.ts; the dock, the Tools menu, the wizard and the
 * API all read from there. See docs/interview-room-tools.md to add a tool.
 */
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { ToolId } from "@/lib/interview/tools";
import type { ToolPlugin, ToolProps } from "./types";
import CodePad, { CodeLangPicker } from "./stages/CodePad";
import Notes from "./stages/Notes";
import QuestionCard from "./stages/QuestionCard";
import RankingBoard from "./RankingBoard";

// Heavy tools load only when someone opens them.
const Whiteboard = dynamic(() => import("./Whiteboard"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-[13px] text-muted gap-2">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Loading the whiteboard
    </div>
  ),
});

export const TOOL_PLUGINS: Record<ToolId, ToolPlugin> = {
  whiteboard: {
    Stage: ({ room, dark, readOnly }: ToolProps) => <Whiteboard doc={room.doc} awareness={room.awareness} dark={dark} readOnly={readOnly} />,
  },
  code: { Stage: CodePad, HeaderActions: CodeLangPicker },
  notes: { Stage: Notes },
  question: { Stage: QuestionCard },
  ranking: {
    Stage: ({ room, isInterviewer, readOnly }: ToolProps) => <RankingBoard doc={room.doc} interviewer={isInterviewer} readOnly={readOnly} />,
  },
  // Dock-only: the toolbox draws the countdown pill itself.
  timer: {
    switchOn: (s) => (s.timer ? { type: "enable", tool: "timer", on: true } : { type: "timer", op: "set", seconds: 10 * 60 }),
  },
};

import type { ComponentType } from "react";
import { Code2, ListOrdered, MessageSquareText, NotebookPen, PenTool, Timer } from "lucide-react";
import type { ToolId } from "@/lib/interview/tools";

export const TOOL_ICON: Record<ToolId, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  whiteboard: PenTool,
  code: Code2,
  notes: NotebookPen,
  question: MessageSquareText,
  ranking: ListOrdered,
  timer: Timer,
};

/**
 * Each tool keeps one colour everywhere in the room, so it is found by
 * colour as well as by name. `tile` is the resting icon square, `solid` the
 * square when the tool is on the stage, `row` the list row around it.
 * Written out in full so Tailwind sees every class.
 */
export const TOOL_TONE: Record<ToolId, { tile: string; solid: string; row: string; text: string }> = {
  whiteboard: { tile: "bg-secondary/15 text-secondary", solid: "bg-secondary text-bg", row: "bg-secondary/10 ring-secondary/40", text: "text-secondary" },
  code: { tile: "bg-accent-4/15 text-accent-4", solid: "bg-accent-4 text-bg", row: "bg-accent-4/10 ring-accent-4/40", text: "text-accent-4" },
  question: { tile: "bg-accent-3/15 text-accent-3", solid: "bg-accent-3 text-bg", row: "bg-accent-3/10 ring-accent-3/40", text: "text-accent-3" },
  notes: { tile: "bg-warning/15 text-warning", solid: "bg-warning text-bg", row: "bg-warning/10 ring-warning/40", text: "text-warning" },
  ranking: { tile: "bg-success/15 text-success", solid: "bg-success text-bg", row: "bg-success/10 ring-success/40", text: "text-success" },
  timer: { tile: "bg-warning/15 text-warning", solid: "bg-warning text-bg", row: "bg-warning/10 ring-warning/40", text: "text-warning" },
};

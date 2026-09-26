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

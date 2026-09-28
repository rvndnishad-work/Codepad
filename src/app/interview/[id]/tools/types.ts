import type { ComponentType } from "react";
import type { ToolsAction, ToolsState } from "@/lib/interview/tools";
import type { ToolsRoom } from "./useToolsRoom";

/** What every tool's UI receives from the toolbox. */
export type ToolProps = {
  room: ToolsRoom;
  state: ToolsState;
  isInterviewer: boolean;
  /** The interview has ended: show content, allow no edits. */
  readOnly: boolean;
  dark: boolean;
  /** Question texts from the interviewer guide (interviewers only; empty for candidates). */
  guideQuestions: string[];
  /** Sends a switchboard action; errors are shown by the toolbox. */
  run: (a: ToolsAction) => Promise<void>;
  /** Set when the stage has no header above it (see ToolPlugin.titleInside):
   * the tool shows this line itself, for example "The candidate sees this". */
  caption?: string;
};

export type ToolPlugin = {
  /** Body of the shared stage. Omit for dock-only tools (the timer). */
  Stage?: ComponentType<ToolProps>;
  /** Extra controls in the stage header, for example a language picker. */
  HeaderActions?: ComponentType<ToolProps>;
  /** What switching the tool on from the Tools menu does. Defaults to
   * presenting it to the candidate. */
  switchOn?: (state: ToolsState) => ToolsAction;
  /** The tool shows its own title and caption (the whiteboard, in its
   * footer), so the interview room drops the header to give it the height. */
  titleInside?: boolean;
};

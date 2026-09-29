"use client";

/** Shared notes: one markdown page both sides type into. */
import SharedEditor from "../SharedEditor";
import type { ToolProps } from "../types";

export default function Notes({ room, dark, readOnly, isInterviewer }: ToolProps) {
  return (
    <SharedEditor
      key={`notes-${dark}`}
      text={room.doc.getText("notes")}
      awareness={room.awareness}
      language="markdown"
      prose
      dark={dark}
      readOnly={readOnly}
      label="Shared notes"
      placeholder={isInterviewer ? "A shared page. Write a prompt here, or let the candidate draft an answer, a plan or an email." : "Write here. Your interviewer sees it as you type."}
    />
  );
}

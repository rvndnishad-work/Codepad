"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import AIInterviewWorkspace from "@/app/ai-interview/[token]/AIInterviewWorkspace";
import { installPreviewFetch, type PreviewState } from "@/lib/ai-interview/preview-fetch";

type WorkspaceProps = React.ComponentProps<typeof AIInterviewWorkspace>;

/**
 * The candidate screen with every screening API answered in the browser.
 * The guard goes in while this component renders, before the candidate
 * screen mounts and makes its first call, and comes out when it unmounts.
 */
export default function PreviewClient({ backHref, ...props }: WorkspaceProps & { backHref: string }) {
  const [state] = useState<PreviewState>(() => {
    const st: PreviewState = { chat: [], engagementLevel: props.session.engagementLevel };
    installPreviewFetch(st);
    return st;
  });
  useEffect(() => installPreviewFetch(state), [state]);

  return (
    <>
      <AIInterviewWorkspace {...props} />
      <div
        role="status"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-full border border-secondary/40 bg-surface/95 backdrop-blur px-4 py-2 text-[13px] text-fg shadow-lg shadow-black/30"
      >
        <Eye className="w-4 h-4 text-secondary-soft" aria-hidden />
        <span>Preview as candidate. Nothing is saved, sent to the AI or graded.</span>
        <a href={backHref} className="text-secondary-soft hover:underline whitespace-nowrap">
          Back to report
        </a>
      </div>
    </>
  );
}

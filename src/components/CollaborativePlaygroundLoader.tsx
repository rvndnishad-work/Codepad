"use client";

import dynamic from "next/dynamic";
import type { SandpackFiles } from "@codesandbox/sandpack-react";

// Browser-only: Yjs + y-webrtc + CodeMirror touch globals (window, crypto,
// document) during module load. Skip SSR entirely.
const CollaborativePlayground = dynamic(
  () => import("@/components/CollaborativePlayground"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center text-muted text-xs">
        Loading collaborative workspace…
      </div>
    ),
  }
);

export default function CollaborativePlaygroundLoader(props: {
  roomId: string;
  template: string;
  initialFiles: SandpackFiles;
  username: string;
  isInterviewer: boolean;
}) {
  return <CollaborativePlayground {...props} />;
}

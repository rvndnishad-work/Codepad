import { FileVideo } from "lucide-react";

export const metadata = {
  title: "Workspace replays — Interviewpad Admin",
};

export default function WorkspaceReplaysPage() {
  return (
    <div className="rounded-xl border border-border bg-surface p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 mx-auto mb-3">
        <FileVideo className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold text-fg">Replays — coming soon</p>
      <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
        Take-home assignment replays and recorded interview sessions for this workspace will appear here.
      </p>
    </div>
  );
}

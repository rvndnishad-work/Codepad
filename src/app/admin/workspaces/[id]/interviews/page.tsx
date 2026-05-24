import { Briefcase } from "lucide-react";

export const metadata = {
  title: "Workspace interviews — Interviewpad Admin",
};

export default function WorkspaceInterviewsPage() {
  return (
    <div className="rounded-xl border border-border bg-surface p-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 mx-auto mb-3">
        <Briefcase className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold text-fg">Interviews — coming soon</p>
      <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
        List of live interview sessions scheduled by this workspace will appear here.
      </p>
    </div>
  );
}

import Link from "next/link";
import { KeyRound, LogIn } from "lucide-react";

const COPY: Record<string, { title: string; body: string }> = {
  expired: {
    title: "This invite link has expired",
    body: "Links stop working a day after the interview. Ask the person who invited you to send a new one.",
  },
  invalid: {
    title: "This invite link does not work",
    body: "It may have been copied only in part, or replaced by a newer invite. Open the link from your most recent email, or ask for a new one.",
  },
  forbidden: {
    title: "You are not on this interview",
    body: "Only the interviewers, the workspace admins and the invited candidate can open this room. If you should be here, ask the host to add you to the panel.",
  },
  login: {
    title: "Open your invite link",
    body: "This room opens from the link in your invitation email. Interviewers in the workspace can sign in instead.",
  },
};

export default function NoAccess({ reason, next }: { reason: string; next: string }) {
  const c = COPY[reason] ?? COPY.login;
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <span className="mx-auto w-11 h-11 rounded-xl bg-secondary/15 text-secondary-soft flex items-center justify-center">
          <KeyRound className="w-5 h-5" aria-hidden />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">{c.title}</h1>
        <p className="mt-2 text-[14px] text-muted leading-relaxed">{c.body}</p>
        {(reason === "login" || reason === "expired" || reason === "invalid") && (
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="mt-6 inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-[13px] font-medium hover:bg-panel"
          >
            <LogIn className="w-3.5 h-3.5 text-muted" aria-hidden /> Interviewer sign in
          </Link>
        )}
      </div>
    </main>
  );
}

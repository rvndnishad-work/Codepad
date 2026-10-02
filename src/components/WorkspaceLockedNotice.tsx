import { Lock } from "lucide-react";

/**
 * Shown in place of a locked workspace (see src/lib/workspace/lock.ts): to
 * its members at /w/[slug], and to candidates on take-home, AI screening and
 * interview links. Says nothing about why; support can explain to the owner.
 */
export default function WorkspaceLockedNotice({ name, audience = "member" }: { name?: string | null; audience?: "member" | "candidate" }) {
  return (
    <main className="min-h-[100dvh] bg-bg flex items-start justify-center px-4 pt-[14vh]">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 flex flex-col gap-4">
        <span aria-hidden className="w-10 h-10 rounded-xl bg-panel text-muted flex items-center justify-center">
          <Lock className="w-5 h-5" strokeWidth={1.75} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold text-fg">This workspace is locked</h1>
          {audience === "member" ? (
            <p className="text-sm text-muted">
              {name ? `${name} has` : "It has"} been locked by Interviewpad. Nothing has been deleted. An owner can contact support to find out more and to
              unlock it.
            </p>
          ) : (
            <p className="text-sm text-muted">
              This link{name ? ` from ${name}` : ""} is not available right now. Nothing you have done is lost. Please contact the person who invited
              you.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Target, Users, FileText, Code2, Briefcase, ArrowRight } from "lucide-react";

export default async function AdminDashboardPage() {
  const [users, challenges, attempts, blogs, snippets, sessions] = await Promise.all([
    prisma.user.count(),
    prisma.challenge.count(),
    prisma.challengeAttempt.count(),
    prisma.blogPost.count(),
    prisma.snippet.count(),
    prisma.interviewSession.count(),
  ]);

  const stats = [
    { label: "Users", value: users, icon: Users, href: null },
    { label: "Challenges", value: challenges, icon: Target, href: "/admin/challenges" },
    { label: "Attempts", value: attempts, icon: Code2, href: null },
    { label: "Blog posts", value: blogs, icon: FileText, href: null },
    { label: "Snippets", value: snippets, icon: Code2, href: null },
    { label: "Interview sessions", value: sessions, icon: Briefcase, href: null },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted mt-1">Overview of platform content.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s) => {
          const inner = (
            <div className="rounded-2xl border border-border bg-surface p-5 hover:bg-elevated transition h-full">
              <div className="flex items-center gap-2 text-muted mb-3">
                <s.icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                  {s.label}
                </span>
                {s.href && <ArrowRight className="w-3 h-3 ml-auto opacity-50" />}
              </div>
              <div className="text-3xl font-black tabular-nums text-fg">{s.value}</div>
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {inner}
            </Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-3">
          Quick actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/challenges/new"
            className="px-4 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition"
          >
            + New Challenge
          </Link>
          <Link
            href="/admin/challenges"
            className="px-4 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-muted hover:text-fg hover:bg-elevated transition"
          >
            Manage challenges
          </Link>
        </div>
      </div>
    </div>
  );
}

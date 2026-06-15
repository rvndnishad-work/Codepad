import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import Link from "next/link";
import { Building2, FileText, Users, Clock, CheckCircle2, Plus, Upload } from "lucide-react";
import QuestionAdminRow from "./QuestionAdminRow";

export const metadata = { title: "Interview Questions — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InterviewQuestionsAdmin() {
  await requireAdminAccess("content:curate");

  const [companies, totalQ, publishedQ, draftQ, totalExp, pendingExp, recent] = await Promise.all([
    prisma.company.count(),
    prisma.prepQuestion.count(),
    prisma.prepQuestion.count({ where: { status: "published" } }),
    prisma.prepQuestion.count({ where: { status: "draft" } }),
    prisma.prepExperience.count(),
    prisma.prepExperience.count({ where: { status: "pending" } }),
    prisma.prepQuestion.findMany({
      orderBy: { updatedAt: "desc" },
      take: 25,
      select: { id: true, title: true, slug: true, status: true, difficulty: true, technology: true, views: true, company: { select: { name: true } } },
    }),
  ]);

  const metrics = [
    { label: "Companies", value: companies, icon: Building2, href: "/admin/interview-questions/companies" },
    { label: "Questions", value: totalQ, icon: FileText, sub: `${publishedQ} published · ${draftQ} draft` },
    { label: "Experiences", value: totalExp, icon: Users, href: "/admin/interview-questions/experiences" },
    { label: "Pending reviews", value: pendingExp, icon: Clock, href: "/admin/interview-questions/experiences", alert: pendingExp > 0 },
    { label: "Published", value: publishedQ, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Interview Questions</h1>
          <p className="text-sm text-muted mt-1">Manage the company-indexed question bank and experiences.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/interview-questions/import" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-xs font-bold hover:border-accent/40 transition">
            <Upload className="w-4 h-4" /> Bulk import
          </Link>
          <Link href="/admin/interview-questions/new" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition">
            <Plus className="w-4 h-4" /> New question
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {metrics.map((m) => {
          const card = (
            <div className={`p-4 rounded-2xl border bg-bg/40 ${m.alert ? "border-amber-500/40" : "border-border"} h-full`}>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted">
                <m.icon className="w-3.5 h-3.5" /> {m.label}
              </div>
              <div className={`text-2xl font-black mt-2 ${m.alert ? "text-amber-500" : ""}`}>{m.value}</div>
              {m.sub && <div className="text-[10px] text-muted mt-0.5">{m.sub}</div>}
            </div>
          );
          return m.href ? (
            <Link key={m.label} href={m.href} className="block hover:opacity-80 transition">{card}</Link>
          ) : (
            <div key={m.label}>{card}</div>
          );
        })}
      </div>

      {/* Nav */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/interview-questions/companies" className="px-3 py-1.5 rounded-lg border border-border font-bold hover:border-accent/40 transition">Companies</Link>
        <Link href="/admin/interview-questions/experiences" className="px-3 py-1.5 rounded-lg border border-border font-bold hover:border-accent/40 transition">Experiences{pendingExp > 0 ? ` (${pendingExp})` : ""}</Link>
      </div>

      {/* Recent questions */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-3">Recent questions</h2>
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg/50 text-[10px] font-black uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3 hidden sm:table-cell">Company</th>
                <th className="text-left p-3 hidden md:table-cell">Tech</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.map((q) => (
                <QuestionAdminRow key={q.id} q={{ ...q, company: q.company?.name ?? null }} />
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted">No questions yet. Create one or bulk import.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

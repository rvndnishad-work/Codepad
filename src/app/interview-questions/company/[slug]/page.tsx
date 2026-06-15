import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Briefcase } from "lucide-react";
import { parseJsonArray } from "@/lib/interview-questions/shared";
import QuestionCard from "../../_components/QuestionCard";
import ExperienceCard from "../../_components/ExperienceCard";
import JsonLd, { breadcrumb } from "../../_components/JsonLd";

export const dynamic = "force-dynamic";

async function getCompany(slug: string) {
  return prisma.company.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getCompany(slug);
  if (!c) return { title: "Company not found — Interviewpad" };
  return {
    title: `${c.name} Interview Questions & Experiences — Interviewpad`,
    description:
      c.description ??
      `Real ${c.name} interview questions and candidate experiences by role, round and difficulty.`,
    alternates: { canonical: `/interview-questions/company/${c.slug}` },
  };
}

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const company = await getCompany(slug);
  if (!company) notFound();

  const activeTab = tab === "experiences" ? "experiences" : "questions";
  const roles = parseJsonArray(company.hiringRoles);

  const [questions, experiences, qCount, eCount] = await Promise.all([
    activeTab === "questions"
      ? prisma.prepQuestion.findMany({
          where: { companyId: company.id, status: "published" },
          orderBy: [{ views: "desc" }],
          select: {
            title: true, slug: true, difficulty: true, technology: true, round: true,
            views: true, likes: true, yearsAsked: true,
          },
          take: 50,
        })
      : Promise.resolve([]),
    activeTab === "experiences"
      ? prisma.prepExperience.findMany({
          where: { companyId: company.id, status: "published" },
          orderBy: [{ year: "desc" }],
          take: 50,
        })
      : Promise.resolve([]),
    prisma.prepQuestion.count({ where: { companyId: company.id, status: "published" } }),
    prisma.prepExperience.count({ where: { companyId: company.id, status: "published" } }),
  ]);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <JsonLd
        data={[
          breadcrumb([
            { name: "Interview Questions", path: "/interview-questions" },
            { name: company.name, path: `/interview-questions/company/${company.slug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: company.name,
            url: company.website ?? undefined,
            description: company.description ?? undefined,
          },
        ]}
      />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link href="/interview-questions" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          All companies
        </Link>

        {/* Company header */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center overflow-hidden shrink-0">
            {company.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-2xl font-black text-accent">{company.name[0]}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{company.name} Interview Questions</h1>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted">
              {company.industry && <span>{company.industry}</span>}
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-accent">
                  <Globe className="w-3.5 h-3.5" /> Website
                </a>
              )}
            </div>
          </div>
        </div>

        {company.description && (
          <p className="text-sm text-muted leading-relaxed mt-4 max-w-3xl">{company.description}</p>
        )}

        {roles.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Frequently asked roles
            </div>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <span key={r} className="px-3 py-1 rounded-lg border border-border bg-surface/50 text-xs font-bold">{r}</span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-8 border-b border-border">
          <TabLink slug={company.slug} tab="questions" active={activeTab === "questions"} label={`Questions (${qCount})`} />
          <TabLink slug={company.slug} tab="experiences" active={activeTab === "experiences"} label={`Experiences (${eCount})`} />
        </div>

        <div className="mt-6 space-y-3">
          {activeTab === "questions" ? (
            questions.length > 0 ? (
              questions.map((q) => <QuestionCard key={q.slug} q={{ ...q, company: null }} showCompany={false} />)
            ) : (
              <Empty label="No published questions for this company yet." />
            )
          ) : experiences.length > 0 ? (
            experiences.map((e) => <ExperienceCard key={e.id} e={e} />)
          ) : (
            <Empty label="No interview experiences shared yet." />
          )}
        </div>
      </div>
    </div>
  );
}

function TabLink({ slug, tab, active, label }: { slug: string; tab: string; active: boolean; label: string }) {
  return (
    <Link
      href={`/interview-questions/company/${slug}?tab=${tab}`}
      className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition ${
        active ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"
      }`}
    >
      {label}
    </Link>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-muted py-10 text-center">{label}</p>;
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { templates } from "@/lib/templates";
import TakeHomeBuilder, {
  type CurationChallenge,
  type CurationPlayground,
  type CurationPrompt,
  type PickCandidate,
} from "./TakeHomeBuilder";

export const metadata = {
  title: "New take-home — Interviewpad",
  robots: { index: false, follow: false },
};

export default async function NewTakeHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/w/${slug}/take-homes/new`)}`);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      members: { select: { userId: true, role: true } },
    },
  });
  if (!workspace) notFound();
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) redirect("/dashboard");
  // Authoring take-homes is an OWNER/ADMIN/INTERVIEWER action (same set that
  // can dispatch). Plain members get bounced to the workspace home.
  if (!["OWNER", "ADMIN", "INTERVIEWER"].includes(member.role)) {
    redirect(`/w/${slug}`);
  }

  const [wsChallenges, globalChallenges, wsPrompts, globalPrompts, snippets, candidates] =
    await Promise.all([
      prisma.challenge.findMany({
        where: { workspaceId: workspace.id },
        orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
        select: { id: true, slug: true, title: true, difficulty: true, estimatedMinutes: true, category: true },
      }),
      prisma.challenge.findMany({
        where: { published: true, workspaceId: null },
        orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
        select: { id: true, slug: true, title: true, difficulty: true, estimatedMinutes: true, category: true },
      }),
      prisma.promptScenario.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, slug: true, title: true, difficulty: true, estimatedMinutes: true, category: true },
      }),
      prisma.promptScenario.findMany({
        where: { published: true, workspaceId: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, slug: true, title: true, difficulty: true, estimatedMinutes: true, category: true },
      }),
      prisma.snippet.findMany({
        where: { userId: session.user.id },
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
        take: 50,
        select: { id: true, slug: true, title: true, template: true },
      }),
      prisma.candidate.findMany({
        where: { workspaceId: workspace.id, email: { not: null } },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, email: true, stage: true },
      }),
    ]);

  const seen = new Set<string>();
  const challenges: CurationChallenge[] = [
    ...wsChallenges.map((c) => ({ ...c, workspaceOwned: true })),
    ...globalChallenges.map((c) => ({ ...c, workspaceOwned: false })),
  ]
    .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      difficulty: c.difficulty as "easy" | "medium" | "hard",
      estimatedMinutes: c.estimatedMinutes,
      category: c.category,
      workspaceOwned: c.workspaceOwned,
    }));

  const prompts: CurationPrompt[] = [
    ...wsPrompts.map((p) => ({ ...p, workspaceOwned: true })),
    ...globalPrompts.map((p) => ({ ...p, workspaceOwned: false })),
  ].map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty as "beginner" | "intermediate" | "advanced",
    estimatedMinutes: p.estimatedMinutes,
    category: p.category,
    workspaceOwned: p.workspaceOwned,
  }));

  const playgrounds: CurationPlayground[] = [
    ...templates.map((t) => ({ id: `template:${t.id}`, title: t.title, template: t.id, isTemplate: true })),
    ...snippets.map((s) => ({ id: s.id, title: s.title, template: s.template, isTemplate: false })),
  ];

  const candidateOptions: PickCandidate[] = candidates
    .filter((c) => !!c.email)
    .map((c) => ({ id: c.id, name: c.name, email: c.email as string, stage: c.stage }));

  return (
    <TakeHomeBuilder
      slug={slug}
      workspaceName={workspace.name}
      challenges={challenges}
      prompts={prompts}
      playgrounds={playgrounds}
      candidates={candidateOptions}
    />
  );
}

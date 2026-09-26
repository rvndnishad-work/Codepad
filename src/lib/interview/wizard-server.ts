/**
 * Data for the live interview wizard and the "pick questions" page: people,
 * teammates, coding rounds and question guides for one workspace.
 * Server-only.
 */
import { prisma } from "@/lib/prisma";
import { templates } from "@/lib/templates";
import { classifyChallenge, classifyTemplate } from "@/lib/interview/stack";
import { loadQuestionnaires } from "@/lib/library/library-server";
import type { GuideOption, MemberOption, PersonOption, RoundOption } from "@/lib/interview/wizard";

export type { GuideOption, MemberOption, PersonOption, RoundOption };

export type WizardData = {
  people: PersonOption[];
  members: MemberOption[];
  rounds: RoundOption[];
  guides: GuideOption[];
};

function strings(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function loadMembers(workspaceId: string): Promise<MemberOption[]> {
  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: { not: "VIEWER" } },
    select: { role: true, user: { select: { id: true, name: true, email: true, image: true } } },
  });
  return rows
    .map((m) => ({ userId: m.user.id, name: m.user.name || m.user.email?.split("@")[0] || "Teammate", email: m.user.email ?? "", role: m.role, image: m.user.image }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadRoundOptions(workspaceId: string, userId: string): Promise<RoundOption[]> {
  const step = { select: { judgingMode: true, languagesJson: true }, orderBy: { position: "asc" as const }, take: 1 };
  const [challenges, prompts, snippets] = await Promise.all([
    prisma.challenge.findMany({
      where: { OR: [{ workspaceId }, { published: true, workspaceId: null }] },
      orderBy: [{ difficulty: "asc" }, { title: "asc" }],
      select: { id: true, title: true, difficulty: true, estimatedMinutes: true, category: true, tags: true, workspaceId: true, steps: step },
    }),
    prisma.promptScenario.findMany({
      where: { OR: [{ workspaceId }, { published: true, workspaceId: null }] },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, difficulty: true, estimatedMinutes: true, category: true, workspaceId: true },
    }),
    prisma.snippet.findMany({
      where: { userId },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      take: 30,
      select: { id: true, title: true, template: true },
    }),
  ]);

  const out: RoundOption[] = [];
  for (const c of challenges) {
    const s = c.steps[0];
    const meta = classifyChallenge({ judgingMode: s?.judgingMode, languages: strings(s?.languagesJson), tags: strings(c.tags), category: c.category });
    out.push({
      kind: "challenge",
      id: c.id,
      title: c.title,
      minutes: c.estimatedMinutes || 30,
      difficulty: c.difficulty,
      category: c.category,
      own: c.workspaceId === workspaceId,
      paradigm: meta.paradigm,
      tags: [...meta.languages, ...meta.frameworks].slice(0, 3),
    });
  }
  for (const t of templates) {
    const meta = classifyTemplate(t.id);
    out.push({
      kind: "playground",
      id: `template:${t.id}`,
      title: t.title,
      minutes: 20,
      difficulty: null,
      category: "Starter editor",
      own: false,
      paradigm: meta.paradigm,
      tags: [...meta.languages, ...meta.frameworks].slice(0, 3),
    });
  }
  for (const s of snippets) {
    const meta = classifyTemplate(s.template);
    out.push({
      kind: "playground",
      id: s.id,
      title: s.title,
      minutes: 20,
      difficulty: null,
      category: "My playground",
      own: true,
      paradigm: meta.paradigm,
      tags: [...meta.languages, ...meta.frameworks].slice(0, 3),
    });
  }
  for (const p of prompts) {
    out.push({
      kind: "prompt",
      id: p.id,
      title: p.title,
      minutes: p.estimatedMinutes || 15,
      difficulty: p.difficulty,
      category: p.category,
      own: p.workspaceId === workspaceId,
      paradigm: null,
      tags: [],
    });
  }
  return out;
}

export async function loadGuides(workspaceId: string): Promise<GuideOption[]> {
  const rows = await loadQuestionnaires(workspaceId);
  return rows
    .filter((r) => r.items.length > 0)
    .map((r) => ({ id: r.id, title: r.title, brief: r.brief, roleArea: r.roleArea, minutes: r.minutes, questions: r.items.map((i) => i.q) }));
}

export async function loadWizardData(workspaceId: string, userId: string): Promise<WizardData> {
  const [candidates, counts, members, rounds, guides] = await Promise.all([
    prisma.candidate.findMany({
      where: { workspaceId, status: { not: "archived" } },
      orderBy: { updatedAt: "desc" },
      take: 2000,
      select: { id: true, name: true, email: true, stage: true, batch: { select: { name: true } } },
    }),
    prisma.interviewSession.groupBy({
      by: ["candidateId"],
      where: { workspaceId, type: "live", candidateId: { not: null } },
      _count: true,
    }),
    loadMembers(workspaceId),
    loadRoundOptions(workspaceId, userId),
    loadGuides(workspaceId),
  ]);
  const n = new Map(counts.map((c) => [c.candidateId, c._count]));
  return {
    people: candidates.map((c) => ({ id: c.id, name: c.name, email: c.email, stage: c.stage, batch: c.batch?.name ?? null, interviews: n.get(c.id) ?? 0 })),
    members,
    rounds,
    guides,
  };
}

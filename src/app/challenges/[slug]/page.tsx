import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { hasAccess, getPaywallOptions } from "@/lib/marketplace/access";
import ChallengePaywall from "./ChallengePaywall";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Layers,
  Lock,
  Play,
  RotateCcw,
  XCircle,
  Binary,
  Braces,
  LayoutTemplate,
  FlaskConical,
  Monitor,
  FileCode,
  Zap,
  Eye,
  type LucideIcon,
} from "lucide-react";
import RelativeTime from "@/components/RelativeTime";
import ChallengeDescription from "../ChallengeDescription";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ invite?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: {
      title: true,
      difficulty: true,
      description: true,
      published: true,
      visibility: true,
    },
  });
  if (!challenge) return { title: "Challenge not found — Interviewpad" };
  const indexable = challenge.published && challenge.visibility === "public";
  const description =
    challenge.description?.slice(0, 160).trim() ||
    `Solve the "${challenge.title}" coding challenge (${challenge.difficulty}).`;
  const title = `${challenge.title} — Interviewpad Challenges`;
  const canonical = `/challenges/${slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

const difficultyBg: Record<string, string> = {
  easy: "bg-emerald-500/10 border-emerald-500/30",
  medium: "bg-amber-500/10 border-amber-500/30",
  hard: "bg-rose-500/10 border-rose-500/30",
};

// ── Challenge type identity ──────────────────────────────────────────────
// Same template-based classification as the catalog page: "harness" is the
// multi-language algorithm judge, test-runner / console templates are JS
// questions, everything else renders a UI. Each type gets its own tint so
// the page is recognisable at a glance.
type ChallengeKind = "algorithms" | "ui" | "js";

function challengeKind(template: string): ChallengeKind {
  if (template === "harness") return "algorithms";
  if (/^test-/.test(template) || ["python", "go", "java", "cpp", "rust", "node", "ts-node"].includes(template)) return "js";
  return "ui";
}

const TYPE_THEME: Record<
  ChallengeKind,
  { label: string; icon: LucideIcon; text: string; iconBox: string; chip: string; heroGrad: string }
> = {
  algorithms: {
    label: "Algorithm",
    icon: Binary,
    text: "text-sky-500",
    iconBox: "bg-sky-500/10 border-sky-500/25 text-sky-500",
    chip: "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400",
    heroGrad: "from-sky-500/[0.07]",
  },
  ui: {
    label: "UI · Frontend",
    icon: LayoutTemplate,
    text: "text-violet-500",
    iconBox: "bg-violet-500/10 border-violet-500/25 text-violet-500",
    chip: "bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400",
    heroGrad: "from-violet-500/[0.07]",
  },
  js: {
    label: "JavaScript",
    icon: Braces,
    text: "text-amber-500",
    iconBox: "bg-amber-500/10 border-amber-500/25 text-amber-500",
    chip: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
    heroGrad: "from-amber-500/[0.07]",
  },
};

const LANG_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  go: "Go",
  java: "Java",
  cpp: "C++",
  rust: "Rust",
};

const FRAMEWORK_BY_TEMPLATE: Record<string, string> = {
  react: "React",
  "react-ts": "React",
  vue: "Vue",
  "vue-ts": "Vue",
  angular: "Angular",
  solid: "SolidJS",
  svelte: "Svelte",
  static: "HTML/CSS",
  vanilla: "Vanilla JS",
  "vanilla-ts": "Vanilla TS",
};

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default async function ChallengeDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { invite: inviteToken } = (await searchParams) ?? {};
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    include: {
      steps: { orderBy: { position: "asc" } },
      author: { select: { id: true, name: true, image: true } },
    },
  });
  if (!challenge) notFound();

  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  const userEmail = session?.user?.email?.toLowerCase() ?? null;

  // ── Access control ───────────────────────────────────────────────────
  // Mirrors the gating on /tracks/[slug] before Tracks were folded in.
  const isOwner = !!userId && challenge.authorId === userId;
  const callerIsAdmin = await staffCan(session, "content:curate");
  let canView = isOwner || callerIsAdmin;

  if (!canView) {
    if (!challenge.published) notFound();
    if (challenge.visibility === "public") {
      canView = true;
    } else {
      // private — check magic-link token then email/userId match
      if (inviteToken) {
        const inv = await prisma.challengeInvitation.findUnique({
          where: { token: inviteToken },
          select: { id: true, challengeId: true, status: true, userId: true },
        });
        const valid =
          !!inv &&
          inv.challengeId === challenge.id &&
          inv.status !== "revoked";
        if (valid) {
          if (!userId) {
            redirect(
              `/login?next=${encodeURIComponent(
                `/challenges/${slug}?invite=${inviteToken}`
              )}`
            );
          }
          if (inv.status === "pending" || inv.userId !== userId) {
            await prisma.challengeInvitation.update({
              where: { id: inv.id },
              data: {
                status: "accepted",
                userId,
                acceptedAt: inv.status === "pending" ? new Date() : undefined,
              },
            });
          }
          canView = true;
        }
      }
      if (!canView && userId) {
        const orClauses: Array<{ userId: string } | { email: string }> = [
          { userId },
        ];
        if (userEmail) orClauses.push({ email: userEmail });
        const matched = await prisma.challengeInvitation.findFirst({
          where: {
            challengeId: challenge.id,
            status: { not: "revoked" },
            OR: orClauses,
          },
          select: { id: true },
        });
        if (matched) canView = true;
      }
    }
  }
  if (!canView) notFound();

  // ── Creator-space paywall ────────────────────────────────────────────
  // If this challenge is gated by a space (SpaceContent), non-owner / non-
  // curator viewers without access (purchase or sufficient-tier membership)
  // see a paywall instead of the runnable challenge.
  if (!isOwner && !callerIsAdmin && !(await hasAccess(userId, "CHALLENGE", challenge.id))) {
    const options = await getPaywallOptions("CHALLENGE", challenge.id);
    if (options) {
      return (
        <ChallengePaywall
          title={challenge.title}
          description={challenge.description}
          options={options}
        />
      );
    }
  }

  const attempts = userId
    ? await prisma.challengeAttempt.findMany({
        where: { userId, challengeId: challenge.id },
        orderBy: { startedAt: "desc" },
        take: 5,
      })
    : [];

  // Per-step status — passed | failed | in_progress | null. Used to render
  // the step list checklist on multi-step challenges.
  const statusByStep: Record<string, "passed" | "failed" | "in_progress"> = {};
  if (userId && challenge.steps.length > 1) {
    const stepAttempts = await prisma.challengeAttempt.findMany({
      where: {
        userId,
        challengeId: challenge.id,
        stepId: { in: challenge.steps.map((s) => s.id) },
      },
      select: { stepId: true, status: true },
    });
    for (const a of stepAttempts) {
      if (!a.stepId) continue;
      const next = a.status as "passed" | "failed" | "in_progress" | "abandoned";
      if (next === "abandoned") continue;
      const prev = statusByStep[a.stepId];
      // passed > failed > in_progress
      if (
        next === "passed" ||
        !prev ||
        (next === "failed" && prev === "in_progress")
      ) {
        statusByStep[a.stepId] = next;
      }
    }
  }

  const tags = parseTags(challenge.tags);
  const bestStatus = attempts.find((a) => a.status === "passed")
    ? "passed"
    : attempts.find((a) => a.status === "failed")
      ? "failed"
      : attempts[0]?.status === "in_progress"
        ? "in_progress"
        : null;
  const isMulti = challenge.steps.length > 1;
  const passedSteps = Object.values(statusByStep).filter((s) => s === "passed").length;
  const nextUnpassedStep = challenge.steps.findIndex(
    (s) => statusByStep[s.id] !== "passed"
  );
  const startStep = nextUnpassedStep < 0 ? 0 : nextUnpassedStep;
  const totalMinutes = challenge.steps.reduce((s, st) => s + st.estimatedMinutes, 0);

  // ── Type-specific launch-card facts ──────────────────────────────────
  const kind = challengeKind(challenge.template);
  const theme = TYPE_THEME[kind];
  const TypeIcon = theme.icon;
  const firstStep = challenge.steps[0];

  let algoInfo: {
    languages: string[];
    signature: string | null;
    totalCases: number;
    hiddenCases: number;
  } | null = null;
  if (kind === "algorithms" && firstStep) {
    const languages = safeParse<string[]>(firstStep.languagesJson, []);
    const sig = safeParse<{ params: { name: string; type: string }[]; returnType: string } | null>(
      firstStep.signatureJson,
      null
    );
    const cases = safeParse<{ isHidden?: boolean }[]>(firstStep.harnessTestsJson, []);
    algoInfo = {
      languages,
      signature:
        sig && firstStep.functionName
          ? `${firstStep.functionName}(${sig.params.map((p) => `${p.name}: ${p.type}`).join(", ")}) → ${sig.returnType}`
          : null,
      totalCases: cases.length,
      hiddenCases: cases.filter((c) => c.isHidden).length,
    };
  }

  let uiInfo: { framework: string; fileCount: number } | null = null;
  if (kind === "ui" && firstStep) {
    const starter = safeParse<Record<string, string>>(firstStep.starterFiles, {});
    uiInfo = {
      framework: FRAMEWORK_BY_TEMPLATE[challenge.template] ?? challenge.template,
      fileCount: Object.keys(starter).length,
    };
  }

  let jsInfo: { testCount: number } | null = null;
  if (kind === "js" && firstStep) {
    const cases = safeParse<unknown[]>(firstStep.testCasesJson, []);
    jsInfo = { testCount: Array.isArray(cases) ? cases.length : 0 };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const challengeJsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: challenge.title,
    description:
      challenge.description?.slice(0, 200).trim() ||
      `Solve the "${challenge.title}" coding challenge.`,
    url: `${siteUrl}/challenges/${challenge.slug}`,
    educationalLevel: challenge.difficulty,
    learningResourceType: isMulti ? "Multi-step coding exercise" : "Coding exercise",
    timeRequired: `PT${totalMinutes}M`,
    inLanguage: "en",
    provider: {
      "@type": "Organization",
      name: "Interviewpad",
      url: siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(challengeJsonLd) }}
      />

      {/* Hero band — tinted by challenge type for instant recognition */}
      <div className={`border-b border-border bg-gradient-to-b ${theme.heroGrad} to-transparent`}>
        <div className="mx-auto max-w-5xl px-6 pt-8 pb-9">
          <Link
            href="/challenges"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition mb-7"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All challenges
          </Link>

          <div className="flex flex-wrap items-start gap-5">
            <div className={`w-14 h-14 rounded-2xl border grid place-items-center shrink-0 ${theme.iconBox}`}>
              <TypeIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] mb-1.5 ${theme.text}`}>
                <span>{theme.label} challenge</span>
                {challenge.category && (
                  <span className="text-muted/60 font-bold tracking-[0.15em]">· {challenge.category}</span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-fg leading-tight">
                {challenge.title}
              </h1>

              <div className="flex items-center gap-2 flex-wrap mt-4">
                <div
                  className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${difficultyBg[challenge.difficulty]} ${difficultyColor[challenge.difficulty]}`}
                >
                  {challenge.difficulty}
                </div>
                <div className="px-2.5 py-1 rounded-md border border-border bg-surface text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {totalMinutes}m
                </div>
                {isMulti && (
                  <div className="px-2.5 py-1 rounded-md border border-accent/30 bg-accent/10 text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    <Layers className="w-3 h-3" />
                    {challenge.steps.length} questions
                  </div>
                )}
                {challenge.visibility === "private" && (
                  <div className="px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    Private
                  </div>
                )}
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-medium text-muted"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-8 items-start">
        {/* ── Main column ── */}
        <div className="min-w-0">

      {/* Status banner for returning users */}
      {bestStatus === "passed" && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-fg">You've solved this!</div>
            <div className="text-xs text-muted">Feel free to revisit and refactor.</div>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 mb-8">
        <ChallengeDescription markdown={challenge.description} />
      </div>

      {/* Step list — only for multi-step challenges. Each step links into
          the attempt page at its index; passed steps show a green check. */}
      {isMulti && (
        <div className="mb-10">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-3">
            Questions in this series
          </h2>
          <ol className="flex flex-col gap-2">
            {challenge.steps.map((step, i) => {
              const status = statusByStep[step.id] ?? null;
              const label = step.title ?? `Question ${i + 1}`;
              return (
                <li key={step.id}>
                  <Link
                    href={`/challenges/${challenge.slug}/attempt?step=${i}`}
                    className="group flex items-center gap-4 p-4 rounded-xl bg-surface border border-border hover:border-border-strong hover:bg-elevated transition"
                  >
                    <div className="w-9 h-9 rounded-lg bg-bg/40 border border-border grid place-items-center text-sm font-black text-muted shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-fg truncate">{label}</div>
                      <div className="text-[10px] text-muted/70 uppercase tracking-wider mt-0.5">
                        {step.estimatedMinutes} min
                      </div>
                    </div>
                    {status === "passed" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : status === "failed" ? (
                      <XCircle className="w-5 h-5 text-rose-500/60 shrink-0" />
                    ) : status === "in_progress" ? (
                      <span className="w-5 h-5 rounded-full border-2 border-amber-500 animate-pulse shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted/30 shrink-0" />
                    )}
                    <ArrowRight className="w-4 h-4 text-muted/40 group-hover:text-fg shrink-0 transition" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Recent attempts */}
      {attempts.length > 0 && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-3">
            Your recent attempts
          </h2>
          <ul className="flex flex-col gap-2">
            {attempts.map((a) => {
              const passed = a.status === "passed";
              const failed = a.status === "failed";
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface/50"
                >
                  {passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : failed ? (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-amber-500 animate-pulse" />
                  )}
                  <span className="text-sm text-fg font-medium capitalize">
                    {a.status.replace("_", " ")}
                  </span>
                  {a.durationSec != null && (
                    <span className="text-xs text-muted tabular-nums">
                      {formatDuration(a.durationSec)}
                    </span>
                  )}
                  <span className="text-xs text-muted/60 ml-auto">
                    <RelativeTime iso={a.startedAt.toISOString()} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
        </div>

        {/* ── Launch sidebar — CTA above the fold + type-specific facts ── */}
        <aside className="order-first lg:order-none lg:sticky lg:top-24 min-w-0">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <Link
              href={`/challenges/${challenge.slug}/attempt${
                isMulti ? `?step=${startStep}` : ""
              }`}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_24px_rgba(var(--accent-rgb),0.25)]"
            >
              {bestStatus === "passed" || (isMulti && passedSteps === challenge.steps.length) ? (
                <RotateCcw className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              {isMulti
                ? passedSteps === challenge.steps.length
                  ? "Practice again"
                  : passedSteps > 0
                  ? `Continue from step ${startStep + 1}`
                  : "Start the series"
                : bestStatus === "passed"
                ? "Practice again"
                : bestStatus === "in_progress"
                ? "Resume"
                : "Start challenge"}
            </Link>

            {isMulti && passedSteps > 0 && passedSteps < challenge.steps.length && (
              <div className="mt-3.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted mb-1">
                  <span className="uppercase tracking-wider">Progress</span>
                  <span className="tabular-nums">
                    {passedSteps} / {challenge.steps.length} solved
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-bg border border-border overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${Math.round((passedSteps / challenge.steps.length) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {!userId && (
              <p className="mt-3 text-[11px] text-muted text-center">
                <Link href="/login" className="text-accent hover:underline font-semibold">
                  Sign in
                </Link>{" "}
                to save your progress.
              </p>
            )}

            <div className="mt-5 pt-5 border-t border-border flex flex-col gap-4">
              {kind === "algorithms" && algoInfo && (
                <>
                  {algoInfo.signature && (
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted mb-1.5">
                        Implement
                      </div>
                      <code className="block rounded-lg border border-border bg-bg px-3 py-2 text-[11px] font-mono text-muted overflow-x-auto whitespace-nowrap">
                        {algoInfo.signature}
                      </code>
                    </div>
                  )}
                  {algoInfo.languages.length > 0 && (
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted mb-1.5">
                        Solve in {algoInfo.languages.length} languages
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {algoInfo.languages.map((l) => (
                          <span
                            key={l}
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${theme.chip}`}
                          >
                            {LANG_LABEL[l] ?? l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {algoInfo.totalCases > 0 && (
                    <FactRow
                      icon={FlaskConical}
                      text={`${algoInfo.totalCases} test case${algoInfo.totalCases === 1 ? "" : "s"}${
                        algoInfo.hiddenCases > 0 ? ` — ${algoInfo.hiddenCases} hidden` : ""
                      }`}
                    />
                  )}
                  <FactRow icon={Zap} text="Auto-graded the moment you submit" />
                </>
              )}

              {kind === "ui" && uiInfo && (
                <>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted mb-1.5">
                      Build with
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold ${theme.chip}`}>
                      {uiInfo.framework}
                    </span>
                  </div>
                  <FactRow icon={Monitor} text="Live preview — watch your UI render as you type" />
                  {uiInfo.fileCount > 1 && (
                    <FactRow
                      icon={FileCode}
                      text={`${uiInfo.fileCount} starter files in the workspace`}
                    />
                  )}
                  <FactRow icon={Eye} text="Submission is kept for human review" />
                </>
              )}

              {kind === "js" && jsInfo && (
                <>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted mb-1.5">
                      Write in
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["TypeScript", "JavaScript"].map((l) => (
                        <span
                          key={l}
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${theme.chip}`}
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <FactRow
                    icon={FlaskConical}
                    text={
                      jsInfo.testCount > 0
                        ? `${jsInfo.testCount} graded test case${jsInfo.testCount === 1 ? "" : "s"}`
                        : "Hidden unit-test suite"
                    }
                  />
                  <FactRow icon={Zap} text="Auto-graded the moment you submit" />
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function FactRow({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-start gap-2.5 text-xs text-muted">
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted/70" />
      <span className="leading-relaxed">{text}</span>
    </div>
  );
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string")
      : [];
  } catch {
    return [];
  }
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

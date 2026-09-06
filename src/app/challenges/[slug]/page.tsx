import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { hasAccess, getPaywallOptions } from "@/lib/marketplace/access";
import ChallengePaywall from "./ChallengePaywall";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  Play,
  RotateCcw,
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
import ChallengeBriefingHero from "./_wow/ChallengeBriefingHero";
import WowReveal from "@/components/wow/WowReveal";
import OrbitDivider from "../../candidate/challenges/_wow/OrbitDivider";

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
  if (!challenge) return { title: "Challenge not found â€” Interviewpad" };
  const indexable = challenge.published && challenge.visibility === "public";
  const description =
    challenge.description?.slice(0, 160).trim() ||
    `Solve the "${challenge.title}" coding challenge (${challenge.difficulty}).`;
  const title = `${challenge.title} â€” Interviewpad Challenges`;
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

// â”€â”€ Challenge type identity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  { label: string; icon: LucideIcon; text: string; iconBox: string; chip: string; heroGrad: string; hex: string }
> = {
  algorithms: {
    label: "Algorithm",
    icon: Binary,
    text: "text-sky-800 dark:text-sky-400",
    iconBox: "bg-sky-500/10 border-sky-500/25 text-sky-800 dark:text-sky-400",
    chip: "bg-sky-500/10 border-sky-500/30 text-sky-800 dark:text-sky-400",
    heroGrad: "from-sky-500/[0.07]",
    hex: "#38bdf8",
  },
  ui: {
    label: "UI Â· Frontend",
    icon: LayoutTemplate,
    text: "text-violet-800 dark:text-violet-400",
    iconBox: "bg-violet-500/10 border-violet-500/25 text-violet-800 dark:text-violet-400",
    chip: "bg-violet-500/10 border-violet-500/30 text-violet-800 dark:text-violet-400",
    heroGrad: "from-violet-500/[0.07]",
    hex: "#a78bfa",
  },
  js: {
    label: "JavaScript",
    icon: Braces,
    text: "text-amber-800 dark:text-amber-400",
    iconBox: "bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-400",
    chip: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-400",
    heroGrad: "from-amber-500/[0.07]",
    hex: "#fbbf24",
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

  // â”€â”€ Access control â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Mirrors the gating on /tracks/[slug] before Tracks were folded in.
  const isOwner = !!userId && challenge.authorId === userId;
  const callerIsAdmin = await staffCan(session, "content:curate");
  let canView = isOwner || callerIsAdmin;

  if (!canView) {
    if (!challenge.published) notFound();
    if (challenge.visibility === "public") {
      canView = true;
    } else {
      // private â€” check magic-link token then email/userId match
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

  // â”€â”€ Creator-space paywall â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Per-step status â€” passed | failed | in_progress | null. Used to render
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
  // Up next rail â€” same category when possible, else same template family.
  const upNext = await prisma.challenge.findMany({
    where: {
      published: true,
      visibility: "public",
      slug: { not: slug },
      ...(challenge.category ? { category: challenge.category } : { template: challenge.template }),
    },
    select: { slug: true, title: true, difficulty: true, estimatedMinutes: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
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

  // â”€â”€ Type-specific launch-card facts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const kind = challengeKind(challenge.template);
  const theme = TYPE_THEME[kind];
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
          ? `${firstStep.functionName}(${sig.params.map((p) => `${p.name}: ${p.type}`).join(", ")}) â†’ ${sig.returnType}`
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

      {/* Briefing dossier masthead */}
      <ChallengeBriefingHero
        kind={kind}
        typeLabel={theme.label}
        category={challenge.category}
        title={challenge.title}
        difficulty={challenge.difficulty}
        minutes={totalMinutes}
        steps={challenge.steps.length}
        isMulti={isMulti}
        visibility={challenge.visibility}
        tags={tags}
      />

      <div className="bg-[var(--wow-bg)] text-[var(--wow-fg)] transition-colors">
      <div className="mx-auto max-w-5xl px-6 py-10 pb-32 space-y-10">
      {/* Status banner for returning users */}
      {bestStatus === "passed" && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4 shadow-[0_0_40px_-16px_rgba(16,185,129,0.5)] backdrop-blur-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1">
            <div className="text-sm font-black text-[var(--wow-fg)]">Cleared. Run it back?</div>
            <div className="text-xs text-muted">Revisit and refactor — speed counts too.</div>
          </div>
          <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 sm:block">Logged</span>
        </div>
      )}

      {/* Unified dossier — mission file + build facts, start at the bottom */}
      <WowReveal>
      <section aria-label="Challenge dossier" className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] backdrop-blur-sm dark:border-white/[0.07]">
        <span aria-hidden className="absolute left-3 top-3 font-mono text-sm font-black text-muted/30 select-none">+</span>
        <span aria-hidden className="absolute right-3 top-3 font-mono text-sm font-black text-muted/30 select-none">+</span>
        <span aria-hidden className="absolute bottom-3 left-3 font-mono text-sm font-black text-muted/30 select-none">+</span>
        <span aria-hidden className="absolute bottom-3 right-3 font-mono text-sm font-black text-muted/30 select-none">+</span>
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-3 dark:border-white/[0.07] sm:px-8">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-muted">Mission file // read carefully</span>
          <span className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted/70">{challenge.difficulty}</span>
          </span>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 p-6 sm:p-8">
            <ChallengeDescription markdown={challenge.description} />
          </div>
          <div className="flex flex-col gap-4 border-t border-black/[0.06] bg-[var(--wow-stage)]/40 p-6 dark:border-white/[0.07] lg:border-l lg:border-t-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">Build with</p>
            {kind === "algorithms" && algoInfo && (
              <>
                {algoInfo.signature && (
                  <code className="block overflow-x-auto whitespace-nowrap rounded-lg border border-black/[0.06] bg-[var(--wow-bg)] px-3 py-2 font-mono text-[11px] text-muted dark:border-white/[0.07]">
                    {algoInfo.signature}
                  </code>
                )}
                {algoInfo.languages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {algoInfo.languages.map((l) => (
                      <span key={l} className="rounded-md border border-black/[0.06] bg-[var(--wow-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--wow-fg)]/80 dark:border-white/[0.07]">
                        {LANG_LABEL[l] ?? l}
                      </span>
                    ))}
                  </div>
                )}
                {algoInfo.totalCases > 0 && (
                  <FactRow icon={FlaskConical} text={`${algoInfo.totalCases} tests${algoInfo.hiddenCases > 0 ? ` · ${algoInfo.hiddenCases} hidden` : ""}`} />
                )}
                <FactRow icon={Zap} text="Auto-graded on submit" />
              </>
            )}
            {kind === "ui" && uiInfo && (
              <>
                <span className="inline-block w-fit rounded-md border border-black/[0.06] bg-[var(--wow-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--wow-fg)]/80 dark:border-white/[0.07]">
                  {uiInfo.framework}
                </span>
                <FactRow icon={Monitor} text="Live preview as you type" />
                {uiInfo.fileCount > 1 && <FactRow icon={FileCode} text={`${uiInfo.fileCount} starter files`} />}
                <FactRow icon={Eye} text="Human review" />
              </>
            )}
            {kind === "js" && jsInfo && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {["TypeScript", "JavaScript"].map((l) => (
                    <span key={l} className="rounded-md border border-black/[0.06] bg-[var(--wow-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--wow-fg)]/80 dark:border-white/[0.07]">
                      {l}
                    </span>
                  ))}
                </div>
                <FactRow icon={FlaskConical} text={jsInfo.testCount > 0 ? `${jsInfo.testCount} graded tests` : "Hidden test suite"} />
                <FactRow icon={Zap} text="Auto-graded on submit" />
              </>
            )}
          </div>
        </div>

        <div className="border-t border-black/[0.06] px-6 py-5 dark:border-white/[0.07] sm:px-8">
          {isMulti && (
            <div className="mb-4 flex items-center gap-3">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center">
                <svg viewBox="0 0 44 44" className="h-10 w-10 -rotate-90">
                  <circle cx="22" cy="22" r="18" fill="none" strokeWidth="4" className="stroke-black/10 dark:stroke-white/10" />
                  <circle
                    cx="22" cy="22" r="18" fill="none" stroke="url(#dossierRing)" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 18}
                    strokeDashoffset={2 * Math.PI * 18 * (1 - passedSteps / Math.max(1, challenge.steps.length))}
                  />
                  <defs>
                    <linearGradient id="dossierRing" x1="0" y1="0" x2="44" y2="44">
                      <stop offset="0" stopColor="#8b93ff" />
                      <stop offset="1" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 grid place-items-center font-mono text-[10px] font-black tabular-nums text-[var(--wow-fg)]">
                  {passedSteps}/{challenge.steps.length}
                </span>
              </span>
              <p className="text-[11px] leading-relaxed text-muted">
                {passedSteps === challenge.steps.length
                  ? "Series cleared. Run it back for speed."
                  : passedSteps > 0
                    ? `Resuming at step ${startStep + 1}.`
                    : `${challenge.steps.length} stops on this route.`}
              </p>
            </div>
          )}
          <Link
            href={`/challenges/${challenge.slug}/attempt${isMulti ? `?step=${startStep}` : ""}`}
            className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#8b93ff] via-[#ff2fb3] to-[#22d3ee] bg-[length:180%_100%] bg-left px-6 py-4 text-sm font-black uppercase tracking-wider text-white shadow-[0_10px_36px_-8px_rgba(255,47,179,0.65)] transition-all duration-300 hover:bg-right hover:shadow-[0_14px_44px_-8px_rgba(255,47,179,0.8)] active:translate-y-px"
          >
            <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            {bestStatus === "passed" || (isMulti && passedSteps === challenge.steps.length) ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
            {isMulti
              ? passedSteps === challenge.steps.length
                ? "Practice again"
                : passedSteps > 0
                ? `Continue · step ${startStep + 1}`
                : "Start the series"
              : bestStatus === "passed"
              ? "Practice again"
              : bestStatus === "in_progress"
              ? "Resume run"
              : "Start challenge"}
          </Link>
          {!userId && (
            <p className="mt-3 text-center text-[11px] text-muted">
              <Link href="/login" className="font-semibold text-[var(--wow-fg)] hover:underline">
                Sign in
              </Link>{" "}
              to save your progress.
            </p>
          )}
        </div>
      </section>
      </WowReveal>

      {/* Step list — route timeline for multi-step challenges */}
      {isMulti && (
        <div>
          <OrbitDivider label={`Route · ${challenge.steps.length} stops`} />
          <ol className="relative mt-5 space-y-2 pl-8 before:absolute before:bottom-4 before:left-[13px] before:top-4 before:w-px before:bg-gradient-to-b before:from-[#8b93ff]/60 before:via-[#8b93ff]/20 before:to-transparent">
            {challenge.steps.map((step, i) => {
              const status = statusByStep[step.id] ?? null;
              const label = step.title ?? `Question ${i + 1}`;
              return (
                <li key={step.id} className="relative">
                  <span
                    aria-hidden
                    className={`absolute -left-8 top-1/2 grid h-[27px] w-[27px] -translate-y-1/2 place-items-center rounded-full border font-mono text-[10px] font-black tabular-nums ${
                      status === "passed"
                        ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : status === "in_progress"
                          ? "animate-pulse border-amber-500/60 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "border-black/10 bg-[var(--wow-bg)] text-muted dark:border-white/15"
                    }`}
                  >
                    {status === "passed" ? "✓" : i + 1}
                  </span>
                  <Link
                    href={`/challenges/${challenge.slug}/attempt?step=${i}`}
                    className="group flex items-center gap-4 rounded-xl border border-black/[0.06] bg-[var(--wow-card)] p-4 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-[#8b93ff]/40 dark:border-white/[0.07]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-[var(--wow-fg)] transition-colors group-hover:text-[#8b93ff]">{label}</div>
                      <div className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-muted/70">
                        {step.estimatedMinutes} min · stop {i + 1} of {challenge.steps.length}
                      </div>
                    </div>
                    {status === "passed" ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : status === "failed" ? (
                      <XCircle className="h-5 w-5 shrink-0 text-rose-500/60" />
                    ) : status === "in_progress" ? (
                      <span className="h-5 w-5 shrink-0 animate-pulse rounded-full border-2 border-amber-500" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted/30" />
                    )}
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted/40 transition group-hover:translate-x-0.5 group-hover:text-[var(--wow-fg)]" />
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
          <OrbitDivider label="Flight log" />
          <ul className="mt-5 flex flex-col gap-2">
            {attempts.map((a) => {
              const passed = a.status === "passed";
              const failed = a.status === "failed";
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-[var(--wow-card)] p-3 backdrop-blur-sm dark:border-white/[0.07]"
                >
                  {passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : failed ? (
                    <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <div className="h-4 w-4 animate-pulse rounded-full border-2 border-amber-500" />
                  )}
                  <span className="text-sm font-medium capitalize text-[var(--wow-fg)]">
                    {a.status.replace("_", " ")}
                  </span>
                  {a.durationSec != null && (
                    <span className="text-xs tabular-nums text-muted">
                      {formatDuration(a.durationSec)}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted/60">
                    <RelativeTime iso={a.startedAt.toISOString()} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
        {/* â”€â”€ Main column â”€â”€ */}
      </div>

      {/* â”€â”€ Up next on this route â”€â”€ */}
      {upNext.length > 0 && (
        <div className="mx-auto mt-14 max-w-5xl px-6">
          <WowReveal>
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#ff2fb3]">Keep moving</p>
                <h2 className="wow-font-display mt-2 text-3xl text-[var(--wow-fg)] md:text-4xl">UP NEXT.</h2>
              </div>
              <Link
                href="/challenges"
                className="hidden shrink-0 items-center gap-1.5 rounded-full border border-black/[0.06] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-muted transition hover:border-[#8b93ff]/50 hover:text-[var(--wow-fg)] dark:border-white/[0.07] sm:inline-flex"
              >
                All challenges <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </WowReveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {upNext.map((n, i) => (
              <WowReveal key={n.slug} delay={i * 0.07} className="h-full">
                <Link
                  href={`/challenges/${n.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-black/[0.06] bg-[var(--wow-card)] p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#8b93ff]/40 hover:shadow-[0_18px_50px_-20px_rgba(139,147,255,0.45)] dark:border-white/[0.07]"
                >
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted/70">
                    {String(i + 1).padStart(2, "0")} // {n.difficulty}
                  </span>
                  <span className="mt-2 line-clamp-2 flex-1 font-extrabold leading-snug text-[var(--wow-fg)] transition-colors group-hover:text-[#8b93ff]">
                    {n.title}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-muted">
                    <Clock className="h-3 w-3" /> {n.estimatedMinutes}m
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted/40 transition group-hover:translate-x-0.5 group-hover:text-[var(--wow-fg)]" />
                  </span>
                </Link>
              </WowReveal>
            ))}
          </div>
        </div>
      )}
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

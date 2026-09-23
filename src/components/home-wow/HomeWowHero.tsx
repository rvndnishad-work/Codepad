import Link from "next/link";
import { ArrowRight, Check, FileCode2, Play } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";

export type HeroStats = {
  questions: number;
  techs: number;
  challenges: number;
  sessions: number;
};

function formatK(n: number): string {
  return n >= 1000 ? `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "")}k+` : String(n);
}

/* The product window shows the Debounce challenge (prisma/seed-challenges.ts)
   solved. This exact solution passes that challenge's three tests, whose
   names are listed below it. Token classes are a hand-rolled highlight. */
type Tok = [text: string, cls?: string];
const KW = "text-secondary";
const TY = "text-accent-4";
const FN = "text-accent";
const PN = "text-muted";
const CODE: Tok[][] = [
  [["export ", KW], ["function ", KW], ["debounce", FN], ["<", PN], ["A ", TY], ["extends ", KW], ["unknown", TY], ["[]>(", PN]],
  [["  fn", ""], [": (...", PN], ["args", ""], [": ", PN], ["A", TY], [") => ", PN], ["void", TY], [",", PN]],
  [["  wait", ""], [": ", PN], ["number", TY]],
  [[") {", PN]],
  [["  let ", KW], ["timer", ""], [": ", PN], ["ReturnType", TY], ["<", PN], ["typeof ", KW], ["setTimeout", FN], ["> | ", PN], ["undefined", TY], [";", PN]],
  [["  return ", KW], ["(...", PN], ["args", ""], [": ", PN], ["A", TY], [") => {", PN]],
  [["    clearTimeout", FN], ["(", PN], ["timer", ""], [");", PN]],
  [["    timer ", ""], ["= ", PN], ["setTimeout", FN], ["(() => ", PN], ["fn", FN], ["(...", PN], ["args", ""], ["), ", PN], ["wait", ""], [");", PN]],
  [["  };", PN]],
  [["}", PN]],
];
const TESTS = ["delays invocation until wait elapses", "resets the timer on each call", "uses the most recent arguments"];

/**
 * Hero: a plain promise, one primary and one secondary action, and the
 * product itself (a challenge solved in the editor, with its tests
 * passing) instead of the old 3D canvas and stock photos. The persona
 * switch is the only route to the hiring side. Numbers come from the DB;
 * zero counts are left out.
 */
export default function HomeWowHero({
  stats,
  userName,
  recentSnippet,
}: {
  stats: HeroStats;
  userName?: string | null;
  recentSnippet?: { slug: string; title: string } | null;
}) {
  const statTiles = [
    { n: stats.questions, v: formatK(stats.questions), l: "interview questions" },
    { n: stats.challenges, v: String(stats.challenges), l: "coding challenges" },
    { n: stats.sessions, v: formatK(stats.sessions), l: "sessions run" },
  ].filter((s) => s.n > 0);

  const promise = [
    stats.questions > 0
      ? `${formatK(stats.questions)} hand-written interview questions${stats.techs > 1 ? ` across ${stats.techs} technologies` : ""}`
      : "Hand-written interview questions",
    "coding challenges you run against real tests in 8 languages",
    "a portfolio that shows your work",
  ];

  return (
    <section data-dark-hero className="wow-noise relative -mt-16 overflow-hidden bg-bg text-fg">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="wow-grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]" />
        <div className="absolute right-[-10%] top-[20%] h-[480px] w-[640px] rounded-full bg-secondary/10 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 pb-20 pt-28 md:pb-24 md:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16">
        <div className="min-w-0">
          <WowReveal y={24}>
            {/* persona switch: developers here, hiring teams one tap away */}
            <nav aria-label="Choose your view" className="inline-flex items-center rounded-full border border-border bg-surface p-1 text-[13px] font-semibold">
              <span aria-current="page" className="rounded-full bg-accent px-4 py-1.5 text-accent-ink">For developers</span>
              <Link href="/hire" className="rounded-full px-4 py-1.5 text-muted transition hover:text-fg">For hiring teams →</Link>
            </nav>
            {userName && <p className="mt-5 text-[15px] font-medium text-muted">Welcome back, {userName.split(" ")[0]}.</p>}

            <h1 className="wow-font-display mt-6 text-[13vw] leading-[0.9] sm:text-7xl lg:text-6xl xl:text-7xl">
              DON&apos;T LEARN<br />
              <span className="wow-gradient-text">TO INTERVIEW.</span><br />
              LIVE INSIDE IT.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
              Interviewpad is where you practise for technical interviews: {promise.join(", ").replace(/, ([^,]*)$/, " and $1")}.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/challenges" className="group inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-black uppercase tracking-wider text-accent-ink transition hover:scale-[1.03]">
                <Play className="h-4 w-4 fill-accent-ink" aria-hidden /> Start a challenge
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link
                href={recentSnippet ? `/play/${recentSnippet.slug}` : "/interview-questions"}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border-strong px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-fg transition hover:border-fg"
              >
                {recentSnippet ? "Resume your sandbox" : "Browse questions"}
              </Link>
            </div>

            {statTiles.length > 0 && (
              <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-5 border-t border-border pt-6">
                {statTiles.map((s) => (
                  <div key={s.l}>
                    <dt className="sr-only">{s.l}</dt>
                    <dd>
                      <span className="wow-font-display block text-3xl tabular-nums md:text-4xl">{s.v}</span>
                      <span aria-hidden className="mt-1 block text-[13px] text-subtle">{s.l}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </WowReveal>
        </div>

        <WowReveal delay={0.15} y={32} className="min-w-0">
          <figure>
            <div className="overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-panel">
              <div className="flex items-center gap-1.5 border-b border-border bg-panel px-4 py-2.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-danger" />
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-warning" />
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-success" />
                <span className="ml-3 inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 font-mono text-[12px] text-fg">
                  <FileCode2 className="h-3.5 w-3.5 text-accent-4" aria-hidden /> index.ts
                </span>
                <span className="ml-auto hidden truncate text-[12px] text-subtle sm:block">Debounce · Medium · 20 min</span>
              </div>
              <pre tabIndex={0} aria-label="Debounce solution in TypeScript" className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-[1.7] sm:text-[13px]">
                <code>
                  {CODE.map((line, i) => (
                    <span key={i} className="block">
                      <span aria-hidden className="mr-4 inline-block w-4 select-none text-right text-subtle">{i + 1}</span>
                      {line.map(([t, c], j) => (
                        <span key={j} className={c || "text-fg"}>{t}</span>
                      ))}
                    </span>
                  ))}
                </code>
              </pre>
              <div className="border-t border-border bg-panel px-4 py-3.5">
                <p className="flex items-center justify-between font-mono text-[12px]">
                  <span className="font-bold text-success">3 passed</span>
                  <span className="text-subtle">index.test.ts</span>
                </p>
                <ul className="mt-2 space-y-1.5 text-[13px]">
                  {TESTS.map((t) => (
                    <li key={t} className="flex items-center gap-2 text-muted">
                      <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                      <span className="truncate">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <figcaption className="mt-3 text-[13px] text-subtle">
              A solved challenge in the editor. Every challenge is graded by tests that run in a sandbox.
            </figcaption>
          </figure>
        </WowReveal>
      </div>
    </section>
  );
}

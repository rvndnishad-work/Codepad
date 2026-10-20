import type { Metadata } from "next";
import { BookOpen, Eye, GitBranch, Plug, Scale, Sparkles, Target, Users } from "lucide-react";
import "@/components/wow/wow.css";
import "@/components/home-wow/home-wow.css";
import "./about.css";
import { prisma } from "@/lib/prisma";
import { currentBrand } from "@/lib/current-site";
import { templates } from "@/lib/templates";
import { SUPPORTED_LANGUAGES } from "@/lib/piston";
import SpotlightScope from "@/components/wow/SpotlightScope";
import ScrollProgressBar from "@/app/hire/ScrollProgressBar";
import AboutHero, { type HeroCopy } from "./AboutHero";
import AboutRuntime from "./AboutRuntime";
import AboutValues, { type Value } from "./AboutValues";
import AboutNumbers, { type Stat } from "./AboutNumbers";
import AboutFinal, { type FinalCopy } from "./AboutFinal";
import { TONES } from "./tone";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await currentBrand();
  return {
    title: `About us — ${brand.name}`,
    description:
      brand.key === "intervutree"
        ? "Intervutree is the hiring runtime: screen, interview, and evaluate developers on proof of craft, not resumes."
        : "DevPrep is where developers practice, learn, and build their way to the next offer.",
  };
}

const RECRUITER_HERO: HeroCopy = {
  eyebrow: "about intervutree",
  lines: ["Hire on proof", "of craft,", "not on paper."],
  intro:
    "Resumes say what someone did. Intervutree shows what they can do. Every applicant gets the same take-home or AI screening interview, every attempt runs on our servers, and you get a ranked shortlist with integrity signals attached.",
  primary: { href: "/features", label: "See what is included" },
  secondary: { href: "/pricing", label: "Pricing" },
};

const DEVELOPER_HERO: HeroCopy = {
  eyebrow: "about devprep",
  lines: ["Practice where", "you will be", "interviewed."],
  intro:
    "DevPrep gives developers runnable challenges, zero-setup playgrounds, curated interview questions and mock interviews with replay, all in the same sandboxes hiring teams use on Intervutree.",
  primary: { href: "/playgrounds", label: "Open a playground" },
  secondary: { href: "/interview-questions", label: "Interview questions" },
};

const RECRUITER_VALUES: Value[] = [
  { icon: Target, title: "Evidence over arrival order", body: "A pile of applications is ranked by what people built under the same conditions, not by who applied first or wrote the best cover letter." },
  { icon: Scale, title: "The same test for everyone", body: "Each applicant meets the same prompt, the same sandbox and the same grader. Fair by construction, and easy to defend." },
  { icon: Eye, title: "Replay, not hearsay", body: "Every attempt is kept as a timeline with integrity signals attached, captured with the candidate's knowledge. The scorecard links to what actually happened." },
  { icon: Plug, title: "Open to your tools", body: "Connect the ATS you already use, and drive assessments from your own agents and scripts through the MCP API." },
];

const DEVELOPER_VALUES: Value[] = [
  { icon: Sparkles, title: "Real code, zero setup", body: "Open a playground and run it. Frontend, backend and full-stack templates boot in the browser with nothing to install." },
  { icon: GitBranch, title: "Practice that looks like the real thing", body: "Challenges are graded on our servers with hidden tests, exactly the way an assessment would be." },
  { icon: Users, title: "Learn from people who have been there", body: "Vetted creators publish tutorials and real interview loops you can work through at your own pace." },
  { icon: BookOpen, title: "A plan, not a pile", body: "Prep journeys turn a target role into a study plan, so you always know what to practice next." },
];

const RECRUITER_FINAL: FinalCopy = {
  eyebrow: "talk to us",
  lines: ["Make your next", "hire the obvious one."],
  primary: { href: "/login?next=/dashboard", label: "Create a workspace" },
  links: [
    { href: "/features", label: "Features" },
    { href: "/docs/mcp", label: "Docs" },
  ],
  contact: "sales@interviewpad.dev",
};

const DEVELOPER_FINAL: FinalCopy = {
  eyebrow: "start today",
  lines: ["Live inside", "the interview."],
  primary: { href: "/playgrounds", label: "Open a playground" },
  links: [
    { href: "/challenges", label: "Challenges" },
    { href: "/interview-questions", label: "Interview questions" },
  ],
};

export default async function AboutPage() {
  const brand = await currentBrand();
  const recruiter = brand.key === "intervutree";
  const tone = TONES[brand.key];

  const [challengeCount, sessionCount, workspaceCount] = await Promise.all([
    prisma.challenge.count({ where: { published: true } }).catch(() => 0),
    prisma.interviewSession.count().catch(() => 0),
    prisma.workspace.count().catch(() => 0),
  ]);

  const stats = buildStats({ challengeCount, sessionCount, workspaceCount, recruiter });

  return (
    <div className="wow-scope min-h-screen bg-bg transition-colors">
      <SpotlightScope />
      <ScrollProgressBar className={tone.bar} />

      <AboutHero tone={tone} copy={recruiter ? RECRUITER_HERO : DEVELOPER_HERO} />

      <AboutRuntime tone={tone} />

      <AboutValues
        tone={tone}
        title={recruiter ? ["Hiring data is sensitive.", "We treat it that way."] : ["Built by people who", "sat on both sides."]}
        intro={
          recruiter
            ? "None of these are roadmap promises. Each one names something the product does today."
            : "We built DevPrep because practising on toy problems in a toy editor does not prepare anyone for the real loop."
        }
        values={recruiter ? RECRUITER_VALUES : DEVELOPER_VALUES}
      />

      <AboutNumbers tone={tone} stats={stats} />

      <AboutFinal tone={tone} copy={recruiter ? RECRUITER_FINAL : DEVELOPER_FINAL} />
    </div>
  );
}

/**
 * Four counters: live rows first (gated on minimums so a fresh install never
 * shows "3 sessions"), then capability constants to fill the strip.
 */
function buildStats(c: { challengeCount: number; sessionCount: number; workspaceCount: number; recruiter: boolean }): Stat[] {
  const stats: Stat[] = [];
  if (c.sessionCount >= 50) stats.push({ value: formatCount(c.sessionCount), label: "Interview sessions run", live: true });
  if (c.challengeCount >= 10) stats.push({ value: formatCount(c.challengeCount), label: "Challenges ready to run", live: true });
  if (c.recruiter && c.workspaceCount >= 25) stats.push({ value: formatCount(c.workspaceCount), label: "Hiring workspaces", live: true });

  // "node" aliases "javascript" in the runner map, so count distinct targets.
  const languages = new Set(SUPPORTED_LANGUAGES.map((l) => (l === "node" ? "javascript" : l))).size;
  const capabilities: Stat[] = [
    { value: `${templates.length}`, label: "Playground templates", live: false },
    { value: `${languages}`, label: "Languages, server-graded", live: false },
    { value: "100%", label: "Attempts kept as a replay", live: false },
    { value: "2", label: "Brands, one shared runtime", live: false },
  ];
  for (const cap of capabilities) {
    if (stats.length >= 4) break;
    stats.push(cap);
  }
  return stats.slice(0, 4);
}

function formatCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) / 10}k+`;
  return `${n}`;
}

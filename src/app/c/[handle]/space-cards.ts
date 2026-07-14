/**
 * Shared contract between the server page (/c/[handle]) and its client
 * presentation components (LatestCarousel, SpaceFeed). Everything here is
 * RSC-serializable — dates travel as ISO strings and tier names are
 * precomputed server-side so the tier list never crosses the boundary.
 */
import {
  BookOpen,
  HelpCircle,
  Briefcase,
  Code2,
  FileText,
  Braces,
  type LucideIcon,
} from "lucide-react";
import type { SectionKey } from "@/lib/creator/layout";

export type ContentSectionKey = Exclude<SectionKey, "ABOUT" | "MEMBERSHIP">;

export const SECTION_META: Record<
  ContentSectionKey,
  { label: string; sub: string; Icon: LucideIcon; gradient: string }
> = {
  TUTORIAL: {
    label: "Tutorials",
    sub: "Step-by-step deep dives",
    Icon: BookOpen,
    gradient: "from-violet-500/25 via-violet-500/10 to-transparent",
  },
  INTERVIEW_QA: {
    label: "Interview Prep",
    sub: "Curated question & answer guides",
    Icon: HelpCircle,
    gradient: "from-rose-500/25 via-rose-500/10 to-transparent",
  },
  INTERVIEW_EXPERIENCE: {
    label: "Interview Experiences",
    sub: "Real loops, round by round",
    Icon: Briefcase,
    gradient: "from-sky-500/25 via-sky-500/10 to-transparent",
  },
  CHALLENGE: {
    label: "Challenges",
    sub: "Runnable, server-graded practice",
    Icon: Braces,
    gradient: "from-amber-500/25 via-amber-500/10 to-transparent",
  },
  SNIPPET: {
    label: "Playgrounds",
    sub: "Fork-and-run code examples",
    Icon: Code2,
    gradient: "from-emerald-500/25 via-emerald-500/10 to-transparent",
  },
  BLOG_POST: {
    label: "Blog",
    sub: "Essays & write-ups",
    Icon: FileText,
    gradient: "from-fuchsia-500/25 via-fuchsia-500/10 to-transparent",
  },
};

export type SpaceCard = {
  key: string;
  title: string;
  href: string;
  cover: string | null;
  summary: string | null;
  chips: string[];
  updatedAtIso: string;
  sectionKey: ContentSectionKey;
  accessTierRank: number | null;
  /** Precomputed label of the cheapest unlocking tier ("Supporter", …). */
  tierName: string | null;
  purchase: { spaceContentId: string; priceCents: number; currency: string } | null;
  unlocked: boolean;
};

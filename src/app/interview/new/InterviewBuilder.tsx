"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Play,
  Trophy,
  Search,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  BookOpen,
  Layers,
  Beaker,
  FileText,
  Zap,
  User,
  Shield,
  HelpCircle,
  FolderOpen,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import { type InterviewArenaSettings } from "@/lib/settings";

export type ChallengeOption = {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  category: string | null;
  /** True when this challenge belongs to the launching workspace (vs the
   *  global public bank). Workspace-owned items sort + render first. */
  workspaceOwned?: boolean;
};

export type PlaygroundOption = {
  id: string;
  slug: string;
  title: string;
  template: string;
  updatedAt: string;
  isTemplate?: boolean;
};

export type PromptScenarioOption = {
  id: string;
  slug: string;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  category: string;
  objective: string;
  /** True when owned by the launching workspace (vs the global bank). */
  workspaceOwned?: boolean;
};

type SourceType = "challenge" | "playground" | "prompt";

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-rose-600 dark:text-rose-400",
};

const difficultyBg: Record<string, string> = {
  easy: "bg-emerald-500/10 border-emerald-500/20",
  medium: "bg-amber-500/10 border-amber-500/20",
  hard: "bg-rose-500/10 border-rose-500/20",
};

// Map template IDs to colors for visual glows in both light mode and dark mode
const templateColors: Record<string, { border: string; glow: string; text: string; bg: string }> = {
  "react": { 
    border: "hover:border-sky-400 dark:hover:border-sky-400/60", 
    glow: "hover:shadow-[0_0_20px_rgba(56,189,248,0.08)] dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]", 
    text: "text-sky-600 dark:text-sky-400", 
    bg: "bg-sky-500/10 border-sky-500/20 dark:bg-sky-400/10 dark:border-sky-400/20" 
  },
  "empty-react": { 
    border: "hover:border-sky-400 dark:hover:border-sky-400/60", 
    glow: "hover:shadow-[0_0_20px_rgba(56,189,248,0.08)] dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]", 
    text: "text-sky-600 dark:text-sky-400", 
    bg: "bg-sky-500/10 border-sky-500/20 dark:bg-sky-400/10 dark:border-sky-400/20" 
  },
  "react-hooks": { 
    border: "hover:border-sky-400 dark:hover:border-sky-400/60", 
    glow: "hover:shadow-[0_0_20px_rgba(56,189,248,0.08)] dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]", 
    text: "text-sky-600 dark:text-sky-400", 
    bg: "bg-sky-500/10 border-sky-500/20 dark:bg-sky-400/10 dark:border-sky-400/20" 
  },
  "react-classes": { 
    border: "hover:border-sky-400 dark:hover:border-sky-400/60", 
    glow: "hover:shadow-[0_0_20px_rgba(56,189,248,0.08)] dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]", 
    text: "text-sky-600 dark:text-sky-400", 
    bg: "bg-sky-500/10 border-sky-500/20 dark:bg-sky-400/10 dark:border-sky-400/20" 
  },
  "empty-ts": { 
    border: "hover:border-blue-500 dark:hover:border-blue-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(59,130,246,0.08)] dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]", 
    text: "text-blue-600 dark:text-blue-400", 
    bg: "bg-blue-500/10 border-blue-500/20 dark:bg-blue-400/10 dark:border-blue-400/20" 
  },
  "typescript": { 
    border: "hover:border-blue-500 dark:hover:border-blue-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(59,130,246,0.08)] dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]", 
    text: "text-blue-600 dark:text-blue-400", 
    bg: "bg-blue-500/10 border-blue-500/20 dark:bg-blue-400/10 dark:border-blue-400/20" 
  },
  "empty-js": { 
    border: "hover:border-yellow-500 dark:hover:border-yellow-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(234,179,8,0.08)] dark:hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]", 
    text: "text-yellow-600 dark:text-yellow-500", 
    bg: "bg-yellow-500/10 border-yellow-500/20 dark:bg-yellow-400/10 dark:border-yellow-400/20" 
  },
  "javascript": { 
    border: "hover:border-yellow-500 dark:hover:border-yellow-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(234,179,8,0.08)] dark:hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]", 
    text: "text-yellow-600 dark:text-yellow-500", 
    bg: "bg-yellow-500/10 border-yellow-500/20 dark:bg-yellow-400/10 dark:border-yellow-400/20" 
  },
  "svelte": { 
    border: "hover:border-orange-500 dark:hover:border-orange-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(249,115,22,0.08)] dark:hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]", 
    text: "text-orange-600 dark:text-orange-400", 
    bg: "bg-orange-500/10 border-orange-500/20 dark:bg-orange-400/10 dark:border-orange-400/20" 
  },
  "vue": { 
    border: "hover:border-emerald-500 dark:hover:border-emerald-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]", 
    text: "text-emerald-600 dark:text-emerald-400", 
    bg: "bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-400/10 dark:border-emerald-400/20" 
  },
  "solid": { 
    border: "hover:border-indigo-500 dark:hover:border-indigo-400/60", 
    glow: "hover:shadow-[0_0_20px_rgba(129,140,248,0.08)] dark:hover:shadow-[0_0_20px_rgba(129,140,248,0.15)]", 
    text: "text-indigo-600 dark:text-indigo-400", 
    bg: "bg-indigo-500/10 border-indigo-500/20 dark:bg-indigo-400/10 dark:border-indigo-400/20" 
  },
  "angular": { 
    border: "hover:border-rose-500 dark:hover:border-rose-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(244,63,94,0.08)] dark:hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]", 
    text: "text-rose-600 dark:text-rose-400", 
    bg: "bg-rose-500/10 border-rose-500/20 dark:bg-rose-400/10 dark:border-rose-400/20" 
  },
  "redux-toolkit": { 
    border: "hover:border-purple-500 dark:hover:border-purple-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(168,85,247,0.08)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]", 
    text: "text-purple-600 dark:text-purple-400", 
    bg: "bg-purple-500/10 border-purple-500/20 dark:bg-purple-400/10 dark:border-purple-400/20" 
  },
  "mobx": { 
    border: "hover:border-amber-600 dark:hover:border-amber-600/60", 
    glow: "hover:shadow-[0_0_20px_rgba(217,119,6,0.08)] dark:hover:shadow-[0_0_20px_rgba(217,119,6,0.15)]", 
    text: "text-amber-600 dark:text-amber-500", 
    bg: "bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/10 dark:border-amber-500/20" 
  },
  "framer-motion": { 
    border: "hover:border-pink-500 dark:hover:border-pink-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(236,72,153,0.08)] dark:hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]", 
    text: "text-pink-600 dark:text-pink-400", 
    bg: "bg-pink-500/10 border-pink-500/20 dark:bg-pink-400/10 dark:border-pink-400/20" 
  },
  "mui": { 
    border: "hover:border-sky-500 dark:hover:border-sky-500/60", 
    glow: "hover:shadow-[0_0_20px_rgba(14,165,233,0.08)] dark:hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]", 
    text: "text-sky-600 dark:text-sky-400", 
    bg: "bg-sky-500/10 border-sky-500/20 dark:bg-sky-400/10 dark:border-sky-400/20" 
  },
};

export default function InterviewBuilder({
  challenges,
  playgrounds,
  promptScenarios = [],
  userType = null,
  arenaSettings = null,
}: {
  challenges: ChallengeOption[];
  playgrounds: PlaygroundOption[];
  promptScenarios: PromptScenarioOption[];
  userType?: string | null;
  arenaSettings?: InterviewArenaSettings | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Launched from a workspace's assessments tab (?workspaceSlug=). A workspace
  // interview is always a recruiter running a LIVE session as the INTERVIEWER,
  // so we force + lock those choices and route "back" into the workspace.
  const workspaceSlug = searchParams?.get("workspaceSlug") || null;
  const fromWorkspace = !!workspaceSlug;

  // Check which session type options are allowed based on userType and dynamic arenaSettings
  const isCandidate = userType === "candidate";
  const isRecruiter = userType === "recruiter";

  const isMockAllowed = isCandidate 
    ? (arenaSettings?.showMockToDeveloper ?? true) 
    : isRecruiter 
      ? (arenaSettings?.showMockToRecruiter ?? true) 
      : true;

  const isLiveAllowed = isCandidate 
    ? false // ALWAYS false for candidates as they only have mock interviews
    : isRecruiter 
      ? (arenaSettings?.showScheduleToRecruiter ?? true) 
      : true;

  const isInterviewerRoleAllowed = isLiveAllowed;

  const initialType: "mock" | "live" = fromWorkspace
    ? "live"
    : searchParams?.get("type") === "live" && isLiveAllowed
      ? "live"
      : isMockAllowed
        ? "mock"
        : "live";
  const initialRole: "interviewer" | "candidate" = fromWorkspace
    ? "interviewer"
    : searchParams?.get("role") === "candidate"
      ? "candidate"
      : isInterviewerRoleAllowed
        ? "interviewer"
        : "candidate";
  const initialSource: SourceType =
    searchParams?.get("source") === "playground" ? "playground" : "challenge";

  const [title, setTitle] = useState("Interview Session");
  const [candidateName, setCandidateName] = useState(searchParams?.get("candidateName") || "");
  const [candidateEmail, setCandidateEmail] = useState(searchParams?.get("candidateEmail") || "");
  const [type, setType] = useState<"mock" | "live">(initialType);
  const [creatorRole, setCreatorRole] = useState<"interviewer" | "candidate">(initialRole);
  const [sourceType, setSourceType] = useState<SourceType>(initialSource);
  const [selectedTimeline, setSelectedTimeline] = useState<{
    id: string;
    type: "challenge" | "playground" | "prompt";
    title: string;
    difficulty?: string;
    template?: string;
    category?: string;
    estimatedMinutes: number;
  }[]>([]);
  const [scenario, setScenario] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [creating, setCreating] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  useEffect(() => {
    setSearchQuery("");
    setFilterDifficulty("all");
  }, [sourceType]);

  const selectedChallenges = useMemo(
    () => selectedTimeline.filter((item) => item.type === "challenge"),
    [selectedTimeline]
  );
  const selectedPlaygrounds = useMemo(
    () => selectedTimeline.filter((item) => item.type === "playground"),
    [selectedTimeline]
  );
  const selectedPromptScenarios = useMemo(
    () => selectedTimeline.filter((item) => item.type === "prompt"),
    [selectedTimeline]
  );

  const totalEstimate = useMemo(
    () => selectedTimeline.reduce((sum, item) => sum + item.estimatedMinutes, 0),
    [selectedTimeline]
  );

  const filteredAvailable = useMemo(() => {
    return challenges.filter((c) => {
      const isSelected = selectedTimeline.some((item) => item.id === c.id && item.type === "challenge");
      if (isSelected) return false;

      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.category && c.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDifficulty = filterDifficulty === "all" || c.difficulty === filterDifficulty;

      return matchesSearch && matchesDifficulty;
    });
  }, [challenges, selectedTimeline, searchQuery, filterDifficulty]);

  const filteredPlaygrounds = useMemo(() => {
    return playgrounds.filter((p) => {
      const isSelected = selectedTimeline.some((item) => item.id === p.id && item.type === "playground");
      if (isSelected) return false;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.template.toLowerCase().includes(q)
      );
    });
  }, [playgrounds, selectedTimeline, searchQuery]);

  const filteredPromptScenarios = useMemo(() => {
    return promptScenarios.filter((p) => {
      const isSelected = selectedTimeline.some((item) => item.id === p.id && item.type === "prompt");
      if (isSelected) return false;

      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDifficulty = filterDifficulty === "all" || p.difficulty === filterDifficulty;

      return matchesSearch && matchesDifficulty;
    });
  }, [promptScenarios, selectedTimeline, searchQuery, filterDifficulty]);

  const availableCount =
    sourceType === "challenge"
      ? challenges.filter((c) => !selectedTimeline.some((item) => item.id === c.id && item.type === "challenge")).length
      : sourceType === "playground"
      ? playgrounds.filter((p) => !selectedTimeline.some((item) => item.id === p.id && item.type === "playground")).length
      : promptScenarios.filter((p) => !selectedTimeline.some((item) => item.id === p.id && item.type === "prompt")).length;

  function add(id: string) {
    if (sourceType === "challenge") {
      const c = challenges.find((x) => x.id === id);
      if (c) {
        setSelectedTimeline((prev) => [...prev, { id, type: "challenge", title: c.title, difficulty: c.difficulty, estimatedMinutes: c.estimatedMinutes }]);
      }
    } else if (sourceType === "playground") {
      const p = playgrounds.find((x) => x.id === id);
      if (p) {
        setSelectedTimeline((prev) => [...prev, { id, type: "playground", title: p.title, template: p.template, estimatedMinutes: 15 }]);
      }
    } else if (sourceType === "prompt") {
      const p = promptScenarios.find((x) => x.id === id);
      if (p) {
        setSelectedTimeline((prev) => [...prev, { id, type: "prompt", title: p.title, difficulty: p.difficulty, category: p.category, estimatedMinutes: p.estimatedMinutes }]);
      }
    }
  }

  function remove(id: string, type: "challenge" | "playground" | "prompt") {
    setSelectedTimeline((prev) => prev.filter((item) => !(item.id === id && item.type === type)));
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    setSelectedTimeline((prev) => {
      const out = [...prev];
      [out[index - 1], out[index]] = [out[index], out[index - 1]];
      return out;
    });
  }

  function moveDown(index: number) {
    setSelectedTimeline((prev) => {
      if (index === -1 || index >= prev.length - 1) return prev;
      const out = [...prev];
      [out[index], out[index + 1]] = [out[index + 1], out[index]];
      return out;
    });
  }

  async function handleStart() {
    if (selectedTimeline.length === 0) {
      toast.error("Pick at least one round to schedule.");
      return;
    }
    setCreating(true);
    try {
      const challengeIds = selectedTimeline.filter((item) => item.type === "challenge").map((item) => item.id);
      const playgroundIds = selectedTimeline.filter((item) => item.type === "playground").map((item) => item.id);
      const promptScenarioIds = selectedTimeline.filter((item) => item.type === "prompt").map((item) => item.id);

      let finalSourceType: "challenge" | "playground" | "prompt" | "combined" = "combined";
      const uniqueTypes = Array.from(new Set(selectedTimeline.map((item) => item.type)));
      if (uniqueTypes.length === 1) {
        finalSourceType = uniqueTypes[0] as any;
      }

      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Interview Session",
          candidateName: candidateName.trim() || null,
          candidateEmail: candidateEmail.trim() || null,
          workspaceSlug: searchParams?.get("workspaceSlug") || null,
          candidateId: searchParams?.get("candidateId") || null,
          type,
          sourceType: finalSourceType,
          challengeIds,
          playgroundIds,
          promptScenarioIds,
          scenario: scenario.trim() || null,
          totalSec: minutes * 60,
          creatorRole,
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      const data = await res.json();
      router.push(`/interview/${data.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to create session", { description: msg });
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden text-fg selection:bg-accent/30 selection:text-accent font-sans py-8 md:py-12 transition-colors duration-300">
      
      {/* Immersive Atmospheric Ambient Glows — Subtle in light mode, gorgeous in dark mode */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[45vw] h-[45vw] rounded-full blur-[140px] opacity-[0.06] dark:opacity-15 bg-violet-500/30 dark:bg-accent/20 transition-all duration-500" />
        <div className="absolute bottom-0 left-0 w-[55vw] h-[55vw] rounded-full blur-[160px] opacity-[0.05] dark:opacity-15 bg-indigo-500/30 dark:bg-indigo-500/20 transition-all duration-500" />
        <div className="absolute top-1/2 left-1/3 w-[30vw] h-[30vw] rounded-full blur-[180px] opacity-[0.04] dark:opacity-10 bg-fuchsia-500/20 dark:bg-fuchsia-500/10 transition-all duration-500" />
      </div>

      <div className="max-w-[1400px] w-full mx-auto px-6 relative z-10 space-y-6">
        
        {/* Navigation & Header strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <Link
              href={workspaceSlug ? `/w/${workspaceSlug}?section=assessments&view=interviews` : "/interview"}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-fg transition-all group"
            >
              <div className="p-1 rounded-full bg-surface border border-border group-hover:border-border-strong group-hover:bg-panel transition-all">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-muted" />
              </div>
              {workspaceSlug ? "Back to workspace" : "Back to Sessions"}
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-400 bg-clip-text text-transparent mt-2">
              Interview Arena Builder
            </h1>
            <p className="text-xs text-muted max-w-xl">
              Configure and curate state-of-the-art coding workflows. Select collaborative environments or automated DSA assessments to build custom chronological session tracks.
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-[10px] font-mono tracking-widest text-accent uppercase font-bold bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-full">
              Ready for Provisioning
            </span>
          </div>
        </div>

        {/* 12-Column Spatial Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Configuration Deck (Span 4) — sticky on lg so it stays in view as the pool scrolls */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6 lg:self-start">
            <div className="bg-surface/85 border border-border backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.37)] p-6 space-y-6 transition-all duration-300 hover:border-border-strong">
              
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-fg uppercase tracking-wider">Session Details</h2>
                  <p className="text-[10px] text-muted leading-none mt-1">Configure workspace rules</p>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/80">
                  Assessment Title
                </label>
                <div className="relative group">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Fullstack Assessment"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-panel border border-border focus:border-accent/50 focus:bg-panel text-xs text-fg placeholder:text-muted/60 dark:placeholder:text-muted/50 outline-none transition-all shadow-inner group-hover:border-border-strong"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-all duration-300" />
                </div>
              </div>

              {/* Candidate Input */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/80">
                  Candidate Name <span className="text-muted/70 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative group">
                  <input
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="e.g. Alexis Jordan"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-panel border border-border focus:border-accent/50 focus:bg-panel text-xs text-fg placeholder:text-muted/60 dark:placeholder:text-muted/50 outline-none transition-all shadow-inner group-hover:border-border-strong"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-all duration-300" />
                </div>
              </div>

              {/* Candidate Email Input */}
              <div className="space-y-2 animate-in fade-in duration-300">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/80">
                  Candidate Email <span className="text-muted/70 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="e.g. alexis@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-panel border border-border focus:border-accent/50 focus:bg-panel text-xs text-fg placeholder:text-muted/60 dark:placeholder:text-muted/50 outline-none transition-all shadow-inner group-hover:border-border-strong"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-all duration-300" />
                </div>
              </div>

              {/* Timer & Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/80">
                    Allocated Timer
                  </label>
                  <span className="text-xs font-mono font-black text-accent tabular-nums bg-accent/5 px-2 py-0.5 rounded border border-accent/15">
                    {minutes} Minutes
                  </span>
                </div>

                {/* Pre-wired Quick-Select pills */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[30, 45, 60, 90].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMinutes(preset)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wider transition-all border ${
                        minutes === preset
                          ? "bg-accent/10 border-accent/40 text-accent font-black"
                          : "bg-panel border border-border text-muted hover:text-fg hover:border-border-strong"
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>

                {/* Manual control slider for precision */}
                <div className="space-y-1.5 pt-1">
                  <input
                    type="range"
                    min={5}
                    max={240}
                    step={5}
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                    className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent transition-all hover:bg-border-strong"
                  />
                  <div className="flex items-center justify-between text-[9px] text-muted/80 font-semibold tracking-wider uppercase font-mono">
                    <span>5 Min</span>
                    <span>Custom limit</span>
                    <span>240 Min</span>
                  </div>
                </div>
              </div>

              {/* Segmented Controls: Creator Role & Interview Type.
                  When launched from a workspace these are fixed (a workspace
                  interview is always an interviewer-run live session), so we
                  show a locked indicator instead of editable toggles. */}
              {fromWorkspace ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/80">
                      Your Arena Role
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-panel border border-border rounded-xl text-[10px] font-bold uppercase tracking-wider text-fg">
                      <Shield className="w-3 h-3 text-accent" /> Interviewer
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/80">
                      Session Class
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-panel border border-border rounded-xl text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <Zap className="w-3 h-3" /> Live Session
                    </div>
                  </div>
                </div>
              ) : isLiveAllowed ? (
                <div className="grid grid-cols-2 gap-4">

                  {/* Role Toggle */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/80">
                      Your Arena Role
                    </label>
                    <div className="flex flex-col gap-1.5 p-1.5 bg-panel border border-border rounded-xl">
                      {isInterviewerRoleAllowed && (
                        <button
                          type="button"
                          onClick={() => setCreatorRole("interviewer")}
                          className={`w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                            creatorRole === "interviewer"
                              ? "bg-accent text-bg shadow-md dark:shadow-lg dark:shadow-accent/10 font-extrabold"
                              : "text-muted hover:text-fg"
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          Interviewer
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCreatorRole("candidate")}
                        className={`w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                          creatorRole === "candidate"
                            ? "bg-accent text-bg shadow-md dark:shadow-lg dark:shadow-accent/10 font-extrabold"
                            : "text-muted hover:text-fg"
                        }`}
                      >
                        <User className="w-3 h-3" />
                        Candidate
                      </button>
                    </div>
                  </div>

                  {/* Classifier Toggle */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted/80">
                      Session Class
                    </label>
                    <div className="flex flex-col gap-1.5 p-1.5 bg-panel border border-border rounded-xl">
                      {isMockAllowed && (
                        <button
                          type="button"
                          onClick={() => setType("mock")}
                          className={`w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border border-transparent ${
                            type === "mock"
                              ? "bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/25 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-extrabold"
                              : "text-muted hover:text-fg"
                          }`}
                        >
                          <HelpCircle className="w-3 h-3" />
                          Mock Practice
                        </button>
                      )}
                      {isLiveAllowed && (
                        <button
                          type="button"
                          onClick={() => setType("live")}
                          className={`w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border border-transparent ${
                            type === "live"
                              ? "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/25 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-extrabold"
                              : "text-muted hover:text-fg"
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          Live Session
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ) : null}

              {/* Scenario Note field — styled with specific background and custom note border in dark mode */}
              <div className="space-y-2 pt-2 border-t border-border animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted/80">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-accent" />
                    Prompt / Guidelines (Note)
                  </span>
                  <span className="text-[10px] text-muted font-mono tracking-wider font-semibold">
                    {scenario.length}/2000
                  </span>
                </div>
                <textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value.slice(0, 2000))}
                  rows={4}
                  placeholder="Provide prompt guidelines or project specs. E.g.: 'Implement real-time search with debouncing. Ensure states bind correctly and errors render gracefully.'"
                  className="w-full px-3 py-2.5 rounded-xl bg-panel border border-border focus:border-accent/50 focus:bg-panel text-xs text-fg placeholder:text-muted/60 dark:placeholder:text-muted/50 outline-none transition-all shadow-inner leading-relaxed resize-none"
                />
              </div>

              {/* Execution Block inside Left Panel */}
              <div className="pt-4 border-t border-border space-y-4">
                
                {/* Total time estimation indicators */}
                <div className="bg-panel border border-border rounded-xl px-4 py-3 flex items-center justify-between text-[11px] text-muted font-medium">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-accent animate-pulse" />
                    Allocated Timer
                  </span>
                  <span className="text-fg font-extrabold tabular-nums">{minutes}m</span>
                </div>

                {sourceType === "challenge" && totalEstimate > minutes && (
                  <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-600 dark:text-rose-400 font-semibold leading-relaxed flex gap-2 items-start animate-bounce">
                    <span className="text-sm">⚠️</span>
                    <span>
                      Alert: Curated sequence requires ~{totalEstimate}m which exceeds the allocated {minutes}m timer!
                    </span>
                  </div>
                )}

                <button
                  onClick={handleStart}
                  disabled={selectedTimeline.length === 0 || creating}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black uppercase tracking-widest text-white transition-all duration-300 shadow-[0_4px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_8px_30px_rgba(217,70,239,0.35)] flex items-center justify-center gap-2 transform active:scale-[0.98]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {creating ? "Creating Session..." : "Start Interview Session"}
                </button>
              </div>

            </div>
          </div>

          {/* RIGHT: Curation Arena (Span 8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Round Source Selector Block */}
            <div className="bg-surface border border-border backdrop-blur-xl rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <span className="text-xs font-extrabold uppercase tracking-widest text-fg/80 px-2">Round Source Curation</span>
              
              <div className="flex items-center gap-2 bg-panel p-1 border border-border rounded-xl max-w-lg w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setSourceType("challenge")}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border border-transparent ${
                    sourceType === "challenge"
                      ? "bg-accent text-bg dark:text-bg shadow-md font-extrabold"
                      : "text-muted hover:text-fg dark:hover:bg-[#171b28]/60"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  DSA Challenges
                </button>
                
                <button
                  type="button"
                  onClick={() => setSourceType("playground")}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border border-transparent ${
                    sourceType === "playground"
                      ? "bg-accent text-bg dark:text-bg shadow-md font-extrabold"
                      : "text-muted hover:text-fg dark:hover:bg-[#171b28]/60"
                  }`}
                >
                  <Beaker className="w-3.5 h-3.5" />
                  Realworld Playgrounds
                </button>

                {!isCandidate && (
                  <button
                    type="button"
                    onClick={() => setSourceType("prompt")}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border border-transparent ${
                      sourceType === "prompt"
                        ? "bg-accent text-bg dark:text-bg shadow-md font-extrabold"
                        : "text-muted hover:text-fg dark:hover:bg-[#171b28]/60"
                    }`}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    Prompt Challenges
                  </button>
                )}
              </div>
            </div>

            {/* Split Screen curation panel (Material Pool on the left, Timeline Sequence on the right) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              
              {/* Material Pool (Span 7) */}
              <div className="md:col-span-7 space-y-4 flex flex-col">
                
                {/* Search & Filters */}
                <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                  <div className="relative group">
                    <Search className="w-3.5 h-3.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-accent transition-colors" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        sourceType === "playground"
                          ? "Filter playrooms or stack templates..."
                          : sourceType === "prompt"
                          ? "Filter prompt challenges..."
                          : "Find coding, concepts, titles..."
                      }
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-panel border border-border focus:border-accent/50 focus:bg-panel text-xs text-fg placeholder:text-muted/60 dark:placeholder:text-muted/50 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Difficulty Filters only for challenges */}
                  {(sourceType === "challenge" || sourceType === "prompt") && (
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-1">
                      {[
                        { id: "all", label: "All Levels" },
                        { id: "easy", label: "Easy", active: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/35 text-emerald-600 dark:text-emerald-400" },
                        { id: "medium", label: "Medium", active: "bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/35 text-amber-600 dark:text-amber-400" },
                        { id: "hard", label: "Hard", active: "bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/35 text-rose-600 dark:text-rose-400" },
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setFilterDifficulty(btn.id)}
                          className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all shrink-0 ${
                            filterDifficulty === btn.id
                              ? btn.active || "bg-accent/10 border-accent/35 text-accent"
                              : "bg-transparent border-border hover:border-border-strong text-muted"
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pool Display */}
                {sourceType === "challenge" ? (
                  <div className="flex-1 min-h-[380px] max-h-[640px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-border/45">
                    {filteredAvailable.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-xs text-muted space-y-2">
                        <BookOpen className="w-8 h-8 text-muted/50 mx-auto" />
                        <p>No matching challenges found.</p>
                      </div>
                    ) : (
                      filteredAvailable.map((c) => (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl border border-border bg-surface/50 hover:bg-surface/90 shadow-sm dark:shadow-md transition-all duration-300 hover:border-border-strong hover:-translate-y-0.5 flex items-center justify-between gap-4 group"
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              {c.workspaceOwned && (
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border leading-none tracking-wider bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400">
                                  Workspace
                                </span>
                              )}
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border leading-none font-mono ${difficultyBg[c.difficulty]} ${difficultyColor[c.difficulty]}`}>
                                {c.difficulty}
                              </span>
                              {c.category && (
                                <span className="text-[9px] font-bold text-muted uppercase tracking-widest bg-panel px-1.5 py-0.5 rounded border border-border">{c.category}</span>
                              )}
                            </div>
                            <h3 className="text-xs font-bold text-fg/90 group-hover:text-fg truncate">{c.title}</h3>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted">
                              <Clock className="w-3 h-3 text-muted/60" />
                              <span>{c.estimatedMinutes}m recommended</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => add(c.id)}
                            className="px-3 py-1.5 rounded-lg bg-panel hover:bg-surface border border-border hover:border-border-strong text-[10px] font-bold text-fg group-hover:text-accent transition flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5 text-muted group-hover:text-accent" />
                            Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : sourceType === "playground" ? (
                  <div className="flex-1 min-h-[380px] max-h-[640px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-border/45">
                    {filteredPlaygrounds.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-xs text-muted space-y-2">
                        <FolderOpen className="w-8 h-8 text-muted/50 mx-auto" />
                        <p>No playgrounds matching current query.</p>
                      </div>
                    ) : (
                      filteredPlaygrounds.map((p) => {
                        const scheme = templateColors[p.template] || {
                          border: "hover:border-accent/40",
                          glow: "hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]",
                          text: "text-accent",
                          bg: "bg-accent/10 border-accent/20",
                        };

                        return (
                          <div
                            key={p.id}
                            className={`p-4 rounded-xl border border-border bg-surface/50 hover:bg-surface/90 shadow-sm dark:shadow-md transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-between gap-4 group ${scheme.border} ${scheme.glow}`}
                          >
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border leading-none ${scheme.bg} ${scheme.text}`}>
                                  {p.template}
                                </span>
                                {p.isTemplate ? (
                                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                    Template
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <h3 className="text-xs font-bold text-fg/90 group-hover:text-fg truncate">{p.title}</h3>
                              {!p.isTemplate && (
                                <p className="text-[9px] text-muted/60 font-mono">
                                  Saved {new Date(p.updatedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => add(p.id)}
                              className="px-3 py-1.5 rounded-lg bg-panel hover:bg-surface border border-border hover:border-border-strong text-[10px] font-bold text-fg group-hover:text-accent transition flex items-center gap-1 shrink-0 shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5 text-muted group-hover:text-accent" />
                              Add
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="flex-1 min-h-[380px] max-h-[640px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-border/45">
                    {filteredPromptScenarios.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-xs text-muted space-y-2">
                        <Brain className="w-8 h-8 text-muted/50 mx-auto" />
                        <p>No prompt scenarios matching current query.</p>
                      </div>
                    ) : (
                      filteredPromptScenarios.map((p) => (
                        <div
                          key={p.id}
                          className="p-4 rounded-xl border border-border bg-surface/50 hover:bg-surface/90 shadow-sm dark:shadow-md transition-all duration-300 hover:border-border-strong hover:-translate-y-0.5 flex items-center justify-between gap-4 group"
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              {p.workspaceOwned && (
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border leading-none tracking-wider bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400">
                                  Workspace
                                </span>
                              )}
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border leading-none font-mono ${difficultyBg[p.difficulty === "beginner" ? "easy" : p.difficulty === "advanced" ? "hard" : "medium"]} ${difficultyColor[p.difficulty === "beginner" ? "easy" : p.difficulty === "advanced" ? "hard" : "medium"]}`}>
                                {p.difficulty === "beginner" ? "easy" : p.difficulty === "advanced" ? "hard" : "medium"}
                              </span>
                              <span className="text-[9px] font-bold text-muted uppercase tracking-widest bg-panel px-1.5 py-0.5 rounded border border-border">{p.category}</span>
                            </div>
                            <h3 className="text-xs font-bold text-fg/90 group-hover:text-fg truncate">{p.title}</h3>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted">
                              <Clock className="w-3 h-3 text-muted/60" />
                              <span>{p.estimatedMinutes}m recommended</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => add(p.id)}
                            className="px-3 py-1.5 rounded-lg bg-panel hover:bg-surface border border-border hover:border-border-strong text-[10px] font-bold text-fg group-hover:text-accent transition flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5 text-muted group-hover:text-accent" />
                            Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>

              <div className="md:col-span-5 flex flex-col">
                <div className="bg-surface border border-border backdrop-blur-xl rounded-2xl p-5 space-y-4 min-h-[300px] flex-1 flex flex-col">
                  
                  <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-fg/80">Arena Timeline</span>
                    <span className="text-[10px] font-mono text-muted tracking-wider bg-panel px-2 py-0.5 rounded border border-border">
                      {selectedTimeline.length} {selectedTimeline.length === 1 ? "Round" : "Rounds"}
                    </span>
                  </div>

                  {selectedTimeline.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <BookOpen className="w-10 h-10 text-muted/50 animate-pulse" />
                      <div>
                        <h4 className="text-xs font-bold text-fg">Timeline is Empty</h4>
                        <p className="text-[10px] text-muted leading-relaxed mt-1 max-w-[200px] mx-auto">
                          Browse and add DSA Challenges, Realworld Playgrounds, or Prompt Challenges to curate your session timeline.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 relative pl-6 scrollbar-thin scrollbar-thumb-border/40">
                      
                      {/* Interactive Chronological Vertical Timeline path */}
                      <div className="absolute left-[9px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-violet-500 via-fuchsia-500 to-indigo-500 rounded z-0" />

                      {selectedTimeline.map((item, idx) => {
                        const isChallenge = item.type === "challenge";
                        const isPlayground = item.type === "playground";
                        const isPrompt = item.type === "prompt";

                        let badgeText = "DSA Challenge";
                        let badgeColor = "text-fuchsia-500 dark:text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/10";
                        let circleColor = "border-fuchsia-500";
                        
                        if (isPlayground) {
                          badgeText = "Playground";
                          badgeColor = "text-violet-500 dark:text-violet-400 border-violet-500/20 bg-violet-500/10";
                          circleColor = "border-violet-500";
                        } else if (isPrompt) {
                          badgeText = "Prompt Challenge";
                          badgeColor = "text-indigo-500 dark:text-indigo-400 border-indigo-500/20 bg-indigo-500/10";
                          circleColor = "border-indigo-500";
                        }

                        return (
                          <div
                            key={`${item.type}-${item.id}`}
                            className="relative flex gap-3 items-start group animate-in fade-in slide-in-from-right-4 duration-300"
                          >
                            {/* Chronological Circle Tracker node */}
                            <div className={`absolute left-[-22px] top-1.5 w-3 h-3 rounded-full bg-bg border-[3px] ${circleColor} z-10 transition-transform group-hover:scale-125 shadow-lg`} />

                            <div className="flex-1 bg-panel border border-border rounded-xl p-3.5 flex items-center justify-between gap-3 group-hover:border-border-strong group-hover:bg-surface transition-all">
                              <div className="min-w-0 space-y-1 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9px] font-extrabold uppercase font-mono tracking-widest text-muted">
                                    Round {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                                  </span>
                                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                                    {badgeText}
                                  </span>
                                </div>
                                <h4 className="text-[11px] font-bold text-fg truncate leading-none mt-1">{item.title}</h4>
                                <div className="flex items-center gap-2 text-[9px] text-muted flex-wrap">
                                  {isChallenge && item.difficulty && (
                                    <span className={`font-semibold capitalize font-mono ${difficultyColor[item.difficulty]}`}>
                                      {item.difficulty}
                                    </span>
                                  )}
                                  {isPlayground && item.template && (
                                    <span className="font-semibold uppercase tracking-wider font-mono text-violet-400">
                                      {item.template}
                                    </span>
                                  )}
                                  {isPrompt && item.difficulty && (
                                    <span className={`font-semibold capitalize font-mono ${difficultyColor[item.difficulty === "beginner" ? "easy" : item.difficulty === "advanced" ? "hard" : "medium"]}`}>
                                      {item.difficulty}
                                    </span>
                                  )}
                                  <span>·</span>
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {item.estimatedMinutes}m
                                  </span>
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="flex flex-col gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveUp(idx)}
                                    disabled={idx === 0}
                                    className="p-1 rounded bg-panel hover:bg-surface border border-border text-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed transition"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveDown(idx)}
                                    disabled={idx === selectedTimeline.length - 1}
                                    className="p-1 rounded bg-panel hover:bg-surface border border-border text-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed transition"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => remove(item.id, item.type)}
                                  className="w-full py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition flex items-center justify-center"
                                  title="Remove round"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

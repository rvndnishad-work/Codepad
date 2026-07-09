"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Trophy,
  ArrowLeft,
  Download,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
  Save,
  Bookmark,
  X,
  ListFilter,
  Check,
  Zap,
} from "lucide-react";

type Row = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  score: number | null;
  challengeId: string;
  challengeTitle: string;
  challengeDifficulty: string;
  dispatchedAt: string;
  submittedAt: string | null;
  expiresAt: string;
  timeToSubmitMin: number | null;
  candidateId: string | null;
  candidateStage: string | null;
  candidateTags: string[];
  tokenPreview: string;
};

type Props = {
  slug: string;
  workspaceName: string;
  challenges: Array<{ id: string; title: string; difficulty: string }>;
  activeChallengeId: string | null;
  rows: Row[];
};

type SortKey = "score" | "timeToSubmit" | "dispatchedAt" | "candidateName";
type SortDir = "asc" | "desc";

type SavedPreset = {
  name: string;
  challenges: string[];
  stages: string[];
  tags: string[];
  startDate: string;
  endDate: string;
  dateType: "dispatched" | "submitted";
  sortKey: SortKey;
  sortDir: SortDir;
};

const STATUS_META: Record<string, { label: string; tone: string; Icon: typeof Clock }> = {
  PENDING: {
    label: "Pending",
    tone: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/[0.06] dark:text-slate-300",
    Icon: Clock,
  },
  ACTIVE: {
    label: "Active",
    tone: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/[0.06] dark:text-amber-300",
    Icon: AlertCircle,
  },
  SUBMITTED: {
    label: "Submitted",
    tone: "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/[0.06] dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  EXPIRED: {
    label: "Expired",
    tone: "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/[0.05] dark:text-rose-300",
    Icon: XCircle,
  },
};

const STAGE_META: Record<string, { label: string; tone: string }> = {
  APPLIED: { label: "Applied", tone: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400" },
  SCREENED: { label: "Screened", tone: "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400" },
  TAKE_HOME: { label: "Take-Home", tone: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400" },
  ONSITE: { label: "Onsite", tone: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400" },
  OFFER: { label: "Offer", tone: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" },
  HIRED: { label: "Hired", tone: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
  REJECTED: { label: "Rejected", tone: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400" },
};

export default function LeaderboardClient({
  slug,
  workspaceName,
  challenges,
  activeChallengeId,
  rows,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [exporting, startExport] = useTransition();

  // Parse Initial state from URL params
  const urlChallenges = searchParams.get("challenges") || "";
  const initialChallenges = useMemo(() => {
    if (activeChallengeId) return new Set([activeChallengeId]);
    return new Set(urlChallenges.split(",").filter(Boolean));
  }, [urlChallenges, activeChallengeId]);

  const urlStages = searchParams.get("stages") || "";
  const initialStages = useMemo(() => new Set(urlStages.split(",").filter(Boolean)), [urlStages]);

  const urlTags = searchParams.get("tags") || "";
  const initialTags = useMemo(() => new Set(urlTags.split(",").filter(Boolean)), [urlTags]);

  const initialStartDate = searchParams.get("startDate") || "";
  const initialEndDate = searchParams.get("endDate") || "";
  const initialDateType = (searchParams.get("dateType") as "dispatched" | "submitted") || "dispatched";

  const initialSortKey = (searchParams.get("sortKey") as SortKey) || "score";
  const initialSortDir = (searchParams.get("sortDir") as SortDir) || "desc";

  // Filter & Sorting Hooks
  const [selectedChallenges, setSelectedChallenges] = useState<Set<string>>(initialChallenges);
  const [selectedStages, setSelectedStages] = useState<Set<string>>(initialStages);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(initialTags);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [dateType, setDateType] = useState<"dispatched" | "submitted">(initialDateType);
  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialSortDir);

  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Saved presets hooks
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);

  // Load presets on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`codepad:leaderboard-presets:${slug}`);
      if (stored) {
        try {
          setSavedPresets(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse presets:", e);
        }
      }
    }
  }, [slug]);

  // Aggregate all unique candidate tags from rows
  const allUniqueTags = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const tags = r.candidateTags || [];
      tags.forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [rows]);

  // Sync state variables back to URL search params
  const syncFiltersToUrl = (
    challengesSet: Set<string>,
    stagesSet: Set<string>,
    tagsSet: Set<string>,
    start: string,
    end: string,
    dType: "dispatched" | "submitted",
    sKey: SortKey,
    sDir: SortDir
  ) => {
    const params = new URLSearchParams();
    params.set("section", "candidates");
    params.set("view", "leaderboard");

    if (challengesSet.size > 0) params.set("challenges", Array.from(challengesSet).join(","));
    if (stagesSet.size > 0) params.set("stages", Array.from(stagesSet).join(","));
    if (tagsSet.size > 0) params.set("tags", Array.from(tagsSet).join(","));
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    if (dType !== "dispatched") params.set("dateType", dType);
    if (sKey !== "score") params.set("sortKey", sKey);
    if (sDir !== "desc") params.set("sortDir", sDir);

    router.replace(`${pathname}?${params.toString()}`);
  };

  // Toggles & Selection Handlers
  const handleToggleChallenge = (challengeId: string) => {
    const next = new Set(selectedChallenges);
    if (next.has(challengeId)) {
      next.delete(challengeId);
    } else {
      next.add(challengeId);
    }
    setSelectedChallenges(next);
    syncFiltersToUrl(next, selectedStages, selectedTags, startDate, endDate, dateType, sortKey, sortDir);
  };

  const handleToggleStage = (stageName: string) => {
    const next = new Set(selectedStages);
    if (next.has(stageName)) {
      next.delete(stageName);
    } else {
      next.add(stageName);
    }
    setSelectedStages(next);
    syncFiltersToUrl(selectedChallenges, next, selectedTags, startDate, endDate, dateType, sortKey, sortDir);
  };

  const handleToggleTag = (tagName: string) => {
    const next = new Set(selectedTags);
    if (next.has(tagName)) {
      next.delete(tagName);
    } else {
      next.add(tagName);
    }
    setSelectedTags(next);
    syncFiltersToUrl(selectedChallenges, selectedStages, next, startDate, endDate, dateType, sortKey, sortDir);
  };

  const handleDateChange = (start: string, end: string, dType: "dispatched" | "submitted") => {
    setStartDate(start);
    setEndDate(end);
    setDateType(dType);
    syncFiltersToUrl(selectedChallenges, selectedStages, selectedTags, start, end, dType, sortKey, sortDir);
  };

  const handleResetFilters = () => {
    setSelectedChallenges(new Set());
    setSelectedStages(new Set());
    setSelectedTags(new Set());
    setStartDate("");
    setEndDate("");
    setDateType("dispatched");
    syncFiltersToUrl(new Set(), new Set(), new Set(), "", "", "dispatched", sortKey, sortDir);
    toast.success("All filters reset successfully.");
  };

  const handleDatePreset = (preset: "today" | "week" | "month") => {
    const now = new Date();
    let start = new Date();
    if (preset === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (preset === "week") {
      start.setDate(now.getDate() - 7);
    } else {
      start.setDate(now.getDate() - 30);
    }
    // Format to YYYY-MM-DD for date input
    const formatted = start.toISOString().split("T")[0];
    handleDateChange(formatted, "", dateType);
  };

  // Presets Handlers
  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const preset: SavedPreset = {
      name: newPresetName.trim(),
      challenges: Array.from(selectedChallenges),
      stages: Array.from(selectedStages),
      tags: Array.from(selectedTags),
      startDate,
      endDate,
      dateType,
      sortKey,
      sortDir,
    };

    const next = [...savedPresets, preset];
    setSavedPresets(next);
    localStorage.setItem(`codepad:leaderboard-presets:${slug}`, JSON.stringify(next));
    setNewPresetName("");
    setShowSavePresetDialog(false);
    toast.success(`Preset view "${preset.name}" saved!`);
  };

  const handleLoadPreset = (preset: SavedPreset) => {
    const nextChallenges = new Set(preset.challenges);
    const nextStages = new Set(preset.stages);
    const nextTags = new Set(preset.tags);

    setSelectedChallenges(nextChallenges);
    setSelectedStages(nextStages);
    setSelectedTags(nextTags);
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
    setDateType(preset.dateType);
    setSortKey(preset.sortKey);
    setSortDir(preset.sortDir);

    syncFiltersToUrl(nextChallenges, nextStages, nextTags, preset.startDate, preset.endDate, preset.dateType, preset.sortKey, preset.sortDir);
    toast.success(`Loaded preset view: ${preset.name}`);
  };

  const handleDeletePreset = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = savedPresets.filter((p) => p.name !== name);
    setSavedPresets(next);
    localStorage.setItem(`codepad:leaderboard-presets:${slug}`, JSON.stringify(next));
    toast.success("Preset deleted successfully.");
  };

  // Client-Side Filtration
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // 1. Challenges filter
      if (selectedChallenges.size > 0 && !selectedChallenges.has(r.challengeId)) {
        return false;
      }
      // 2. Candidate stages filter
      if (selectedStages.size > 0) {
        if (!r.candidateStage || !selectedStages.has(r.candidateStage)) {
          return false;
        }
      }
      // 3. Candidate tags filter
      if (selectedTags.size > 0) {
        const cTags = r.candidateTags || [];
        const hasMatch = cTags.some((tag) => selectedTags.has(tag));
        if (!hasMatch) return false;
      }
      // 4. Date Range filter
      if (startDate || endDate) {
        const dateStr = dateType === "dispatched" ? r.dispatchedAt : r.submittedAt;
        if (!dateStr) return false;
        const targetTime = new Date(dateStr).getTime();
        if (startDate) {
          const startTime = new Date(startDate).getTime();
          if (targetTime < startTime) return false;
        }
        if (endDate) {
          const endTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
          if (targetTime > endTime) return false;
        }
      }
      return true;
    });
  }, [rows, selectedChallenges, selectedStages, selectedTags, startDate, endDate, dateType]);

  // Client-Side Sorting
  // Genuine rank = position by score (highest first, unscored last), computed
  // ONCE over the filtered set and independent of the active sort. Previously
  // the "rank" badge was just the row index, so sorting alphabetically
  // numbered rows 1,2,3 as if they were ranked — misleading.
  const rankById = useMemo(() => {
    const byScore = [...filteredRows].sort((a, b) => {
      if (a.score === null && b.score === null) return 0;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });
    const map = new Map<string, number>();
    byScore.forEach((r, i) => map.set(r.id, i + 1));
    return map;
  }, [filteredRows]);

  const sorted = useMemo(() => {
    const arr = [...filteredRows];
    const dirMul = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const nullCmp = (av: number | null, bv: number | null): number | null => {
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return null;
      };
      switch (sortKey) {
        case "score": {
          const r = nullCmp(a.score, b.score);
          if (r !== null) return r;
          return (a.score! - b.score!) * dirMul;
        }
        case "timeToSubmit": {
          const r = nullCmp(a.timeToSubmitMin, b.timeToSubmitMin);
          if (r !== null) return r;
          return (a.timeToSubmitMin! - b.timeToSubmitMin!) * dirMul;
        }
        case "candidateName":
          return a.candidateName.localeCompare(b.candidateName) * dirMul;
        case "dispatchedAt":
          return (
            (new Date(a.dispatchedAt).getTime() - new Date(b.dispatchedAt).getTime()) *
            dirMul
          );
      }
    });
    return arr;
  }, [filteredRows, sortKey, sortDir]);

  const activeFiltersCount =
    (selectedChallenges.size > 0 ? 1 : 0) +
    (selectedStages.size > 0 ? 1 : 0) +
    (selectedTags.size > 0 ? 1 : 0) +
    (startDate || endDate ? 1 : 0);

  function toggleSort(k: SortKey) {
    let nextDir: SortDir = "desc";
    if (k === sortKey) {
      nextDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      nextDir = k === "score" ? "desc" : k === "timeToSubmit" ? "asc" : "asc";
    }
    setSortKey(k);
    setSortDir(nextDir);
    syncFiltersToUrl(selectedChallenges, selectedStages, selectedTags, startDate, endDate, dateType, k, nextDir);
  }

  // Premium Client-side Exporting (covers current active filter subset)
  function onExportFilteredCsv() {
    startExport(async () => {
      try {
        const header = [
          "Rank",
          "Candidate Name",
          "Candidate Email",
          "Stage",
          "Tags",
          "Challenge",
          "Difficulty",
          "Status",
          "Score (%)",
          "Time to Submit (Min)",
          "Dispatched At",
          "Submitted At",
        ];

        const lines = [header.join(",")];
        const escapeCsv = (val: any) => {
          if (val === null || val === undefined) return "";
          const s = String(val);
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        };

        sorted.forEach((r, idx) => {
          lines.push(
            [
              idx + 1,
              escapeCsv(r.candidateName),
              escapeCsv(r.candidateEmail),
              escapeCsv(r.candidateStage || "Applied"),
              escapeCsv((r.candidateTags || []).join("; ")),
              escapeCsv(r.challengeTitle),
              escapeCsv(r.challengeDifficulty),
              escapeCsv(r.status),
              escapeCsv(r.score !== null ? r.score : ""),
              escapeCsv(r.timeToSubmitMin !== null ? r.timeToSubmitMin : ""),
              escapeCsv(new Date(r.dispatchedAt).toLocaleString()),
              escapeCsv(r.submittedAt ? new Date(r.submittedAt).toLocaleString() : ""),
            ].join(",")
          );
        });

        const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        a.download = `${slug}_leaderboard_filtered_${stamp}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("Filtered CSV downloaded successfully!");
      } catch (err: any) {
        toast.error(err.message ?? "CSV download failed.");
      }
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Dynamic atmospheric header background glow */}
      <div className="absolute top-0 right-1/4 w-[35vw] h-[35vw] rounded-full blur-[140px] opacity-[0.03] dark:opacity-10 bg-indigo-500/20 pointer-events-none" />

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
        <div className="space-y-1 min-w-0">
          <Link
            href={`/w/${slug}`}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-fg transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent inline-flex items-center gap-2 mt-1">
            <Trophy className="w-6 h-6 text-amber-500 animate-pulse" />
            Recruiter Leaderboard
          </h1>
          <p className="text-xs text-muted max-w-2xl leading-relaxed">
            Analyze candidate take-home performance across multiple dimensions. Sort, query, and curate custom rosters dynamically.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
              isFilterExpanded || activeFiltersCount > 0
                ? "bg-accent/10 border-accent/40 text-accent font-black"
                : "bg-surface border-border text-muted hover:text-fg hover:border-border-strong hover:bg-panel"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>

          <button
            type="button"
            onClick={onExportFilteredCsv}
            disabled={exporting || sorted.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_20px_rgba(139,92,246,0.3)]"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </header>

      {/* Preset Saved Views Pill Bar */}
      {savedPresets.length > 0 && (
        <div className="bg-surface/50 border border-border backdrop-blur-xl rounded-2xl p-4 space-y-2.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-accent" />
            Saved View Presets
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            {savedPresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleLoadPreset(preset)}
                className="group inline-flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-full bg-panel hover:bg-panel-strong border border-border hover:border-border-strong text-xs font-bold text-fg transition-all shadow-sm"
              >
                {preset.name}
                <div
                  onClick={(e) => handleDeletePreset(preset.name, e)}
                  className="p-0.5 rounded-full hover:bg-muted-soft transition-colors cursor-pointer"
                  title="Delete preset"
                >
                  <X className="w-3 h-3 text-muted group-hover:text-rose-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Expandable Glassmorphic Filter Drawer */}
      {isFilterExpanded && (
        <div className="bg-surface/90 border border-accent/20 dark:border-border-strong backdrop-blur-2xl rounded-2xl p-6 shadow-xl space-y-6 transition-all duration-300 animate-in slide-in-from-top-4 duration-500">
          
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-fg inline-flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-accent" />
              Advanced Curation Filters
            </h3>
            <button
              onClick={() => setIsFilterExpanded(false)}
              className="p-1 rounded-lg hover:bg-panel border border-transparent hover:border-border transition-colors text-muted hover:text-fg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 1. Date Range Filter (Span 4) */}
            <div className="lg:col-span-4 space-y-3.5 border-r border-border/70 pr-6 last:border-0 last:pr-0">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">
                Date Range Filter
              </label>

              <div className="flex bg-panel p-1 rounded-xl border border-border gap-1">
                <button
                  type="button"
                  onClick={() => handleDateChange(startDate, endDate, "dispatched")}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    dateType === "dispatched"
                      ? "bg-accent text-bg font-extrabold shadow"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  Dispatched
                </button>
                <button
                  type="button"
                  onClick={() => handleDateChange(startDate, endDate, "submitted")}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    dateType === "submitted"
                      ? "bg-accent text-bg font-extrabold shadow"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  Submitted
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted/80">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDateChange(e.target.value, endDate, dateType)}
                    className="w-full px-3 py-2 rounded-xl bg-panel border border-border focus:border-accent/40 text-xs text-fg outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted/80">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleDateChange(startDate, e.target.value, dateType)}
                    className="w-full px-3 py-2 rounded-xl bg-panel border border-border focus:border-accent/40 text-xs text-fg outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-1.5 pt-1.5">
                {["today", "week", "month"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleDatePreset(preset as any)}
                    className="flex-1 py-1 px-2 rounded-lg bg-panel hover:bg-panel-strong border border-border text-[9px] font-bold uppercase tracking-wider text-muted hover:text-fg transition-colors"
                  >
                    {preset === "today" ? "Today" : preset === "week" ? "Last 7d" : "Last 30d"}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Challenge Multi-Select Pool (Span 4) */}
            <div className="lg:col-span-4 space-y-3.5 border-r border-border/70 pr-6 last:border-0 last:pr-0">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">
                Filter by Challenge ({selectedChallenges.size})
              </label>
              
              <div className="max-h-[170px] overflow-y-auto space-y-1.5 pr-2 scrollbar-thin scrollbar-thumb-border/45">
                {challenges.map((c) => {
                  const isChecked = selectedChallenges.has(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleToggleChallenge(c.id)}
                      className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? "bg-accent/5 border-accent/40 text-accent font-black shadow-inner"
                          : "bg-panel border-border hover:border-border-strong text-muted hover:text-fg"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate leading-tight">{c.title}</div>
                        <div className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">{c.difficulty}</div>
                      </div>
                      {isChecked && <Check className="w-3.5 h-3.5 shrink-0 text-accent" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Pipeline Stages & Roster Tags (Span 4) */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Stages Section */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">
                  Pipeline Stage ({selectedStages.size})
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
                  {Object.keys(STAGE_META).map((stage) => {
                    const isChecked = selectedStages.has(stage);
                    const meta = STAGE_META[stage];
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => handleToggleStage(stage)}
                        className={`px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all ${
                          isChecked
                            ? `${meta.tone} border-current font-black scale-95 shadow-inner`
                            : "bg-panel border-border text-muted hover:text-fg hover:border-border-strong"
                        }`}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-2 pt-1 border-t border-border/50">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted">
                  Candidate Tags ({selectedTags.size})
                </label>
                {allUniqueTags.length === 0 ? (
                  <div className="text-[10px] text-muted italic">No candidate tags available.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1">
                    {allUniqueTags.map((tag) => {
                      const isChecked = selectedTags.has(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all ${
                            isChecked
                              ? "bg-accent/10 border-accent/40 text-accent font-black scale-95 shadow-inner"
                              : "bg-panel border-border text-muted hover:text-fg hover:border-border-strong"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Preset Action Row & Form */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border">
            
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/5 text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Filters
              </button>

              <button
                type="button"
                onClick={() => setShowSavePresetDialog(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/30 text-accent hover:bg-accent/5 text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                Save Active Preset
              </button>
            </div>

            {/* Save Preset inline Modal */}
            {showSavePresetDialog && (
              <form onSubmit={handleSavePreset} className="flex items-center gap-2 border border-accent/20 bg-panel px-3 py-1.5 rounded-xl animate-in slide-in-from-left duration-300">
                <input
                  type="text"
                  required
                  placeholder="e.g. Onsite React Developers"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="bg-transparent text-xs text-fg placeholder:text-muted outline-none w-[180px]"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-accent hover:bg-accent-soft text-bg rounded-lg transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowSavePresetDialog(false)}
                  className="p-1 text-muted hover:text-fg"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            )}

            <div className="text-[10px] text-muted font-mono font-bold tracking-wider uppercase bg-panel px-3 py-1.5 rounded-xl border border-border">
              Roster Subset: {sorted.length} / {rows.length} Submissions
            </div>
          </div>

        </div>
      )}

      {/* Main Table view */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg/30 p-16 text-center space-y-4 animate-in fade-in duration-300">
          <Trophy className="w-10 h-10 text-muted/40 mx-auto animate-bounce" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-fg">No take-home submissions found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
              No assignments matched the current filter sequence. Try adjusting your active challenge, pipeline stage, or date configurations.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-bg bg-fg hover:opacity-95 transition-opacity"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface/40 backdrop-blur-xl overflow-hidden shadow-sm dark:shadow-md transition-all">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-panel/40 border-b border-border text-[10px] uppercase tracking-[0.12em] text-muted/80 font-bold">
                <SortableTh label="Rank" active={sortKey === "score"} dir={sortDir} onClick={() => toggleSort("score")} />
                <th className="px-4 py-3.5 text-left font-bold">Challenge</th>
                <th className="px-4 py-3.5 text-left font-bold">Status</th>
                <SortableTh label="Score" active={sortKey === "score"} dir={sortDir} onClick={() => toggleSort("score")} align="right" />
                <SortableTh label="Time to submit" active={sortKey === "timeToSubmit"} dir={sortDir} onClick={() => toggleSort("timeToSubmit")} align="right" />
                <SortableTh label="Dispatched" active={sortKey === "dispatchedAt"} dir={sortDir} onClick={() => toggleSort("dispatchedAt")} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((r, i) => {
                const meta = STATUS_META[r.status] ?? STATUS_META.PENDING;
                const rank = rankById.get(r.id) ?? i + 1;
                const stage = r.candidateStage ? STAGE_META[r.candidateStage] : null;

                return (
                  <tr key={r.id} className="hover:bg-panel/20 transition-all duration-300">
                    
                    {/* Candidate Name, Email & Rank */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-bg border border-border text-[10px] font-mono font-bold flex items-center justify-center text-muted shrink-0 mt-0.5 shadow-sm">
                          {rank}
                        </div>
                        <div className="min-w-0">
                          {r.candidateId ? (
                            <Link
                              href={`/w/${slug}/candidates/${r.candidateId}`}
                              className="text-fg font-semibold hover:text-accent block truncate text-sm transition-colors"
                            >
                              {r.candidateName}
                            </Link>
                          ) : (
                            <span className="text-fg font-semibold text-sm">{r.candidateName}</span>
                          )}
                          <div className="text-[10px] text-muted font-mono truncate flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 shrink-0 text-muted/60" />
                            {r.candidateEmail}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Challenge Title, Difficulty & Candidate Tags */}
                    <td className="px-4 py-3 align-top">
                      <div className="text-xs text-fg font-semibold truncate max-w-[240px]">{r.challengeTitle}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted/70 bg-panel px-1.5 py-0.5 rounded border border-border">
                          {r.challengeDifficulty}
                        </span>

                        {/* Pipeline Stage Tag */}
                        {stage && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${stage.tone}`}>
                            {stage.label}
                          </span>
                        )}

                        {/* Candidate Custom Tags */}
                        {r.candidateTags && r.candidateTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-panel/50 border border-border text-[8px] font-medium text-muted/80"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Assessment Status Badge */}
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${meta.tone} shadow-sm`}>
                        <meta.Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </td>

                    {/* Score (Right aligned, code font) */}
                    <td className="px-4 py-3 align-top text-right font-mono text-xs">
                      {r.score !== null ? (
                        <span className="text-fg font-extrabold bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded">
                          {r.score}%
                        </span>
                      ) : (
                        <span className="text-muted/40 font-semibold">—</span>
                      )}
                    </td>

                    {/* Time to Submit (Right aligned, code font) */}
                    <td className="px-4 py-3 align-top text-right font-mono text-xs text-fg font-medium">
                      {r.timeToSubmitMin !== null ? (
                        <span>{r.timeToSubmitMin}m</span>
                      ) : (
                        <span className="text-muted/40 font-semibold">—</span>
                      )}
                    </td>

                    {/* Dispatched Date */}
                    <td className="px-4 py-3 align-top text-[11px] text-muted font-mono leading-relaxed">
                      {new Date(r.dispatchedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[10px] text-muted/70 font-semibold uppercase tracking-wider pt-2">
        <div>
          Showing {sorted.length} row{sorted.length === 1 ? "" : "s"} of {rows.length} total
          {activeFiltersCount > 0 ? " · filtered subset" : ""}
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 hover:text-fg text-accent transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

    </div>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th className={`px-4 py-3.5 font-bold ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 hover:text-fg transition-colors ${
          active ? "text-fg" : "text-muted/80"
        }`}
      >
        {label}
        {active ? (
          dir === "desc" ? <ArrowDown className="w-3.5 h-3.5 text-fg" /> : <ArrowUp className="w-3.5 h-3.5 text-fg" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 opacity-35" />
        )}
      </button>
    </th>
  );
}

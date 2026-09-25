"use client";

/**
 * Prompt tasks in the Question library: the scenario catalogue and the
 * graded attempts. Moved here from the old Assessments section.
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Brain, Clock, Copy, Eye, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { humanize } from "@/lib/workspace/display";

export type PromptScenario = {
  id: string;
  slug: string;
  title: string;
  description: string;
  objective: string;
  expectedTraits: string;
  difficulty: string;
  category: string;
  estimatedMinutes: number;
  workspaceId: string | null;
  published: boolean;
};

export type PromptAttemptItem = {
  id: string;
  promptText: string;
  charCount: number;
  tokenEstimate: number;
  score: number | null;
  rubricScores: string | null;
  feedback: string | null;
  graderType: string | null;
  sessionId: string | null;
  userId: string | null;
  durationSec: number | null;
  createdAt: string;
  scenarioTitle: string;
  scenarioCategory: string;
  scenarioDifficulty: string;
  /** Who wrote it: the session candidate, else the signed-in user. */
  candidateName: string | null;
};


export default function PromptTasks({
  workspace,
  promptScenarios,
  promptAttempts,
}: {
  workspace: { id: string; slug: string };
  promptScenarios: PromptScenario[];
  promptAttempts: PromptAttemptItem[];
}) {
  const [view, setView] = useState<"scenarios" | "attempts">("scenarios");
  const [currentPromptScenarios, setCurrentPromptScenarios] = useState<PromptScenario[]>(promptScenarios);
  const [createPromptOpen, setCreatePromptOpen] = useState(false);
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [scenarioDesc, setScenarioDesc] = useState("");
  const [scenarioObjective, setScenarioObjective] = useState("");
  const [scenarioCategory, setScenarioCategory] = useState("code-generation");
  const [scenarioDifficulty, setScenarioDifficulty] = useState("intermediate");
  const [scenarioEstMin, setScenarioEstMin] = useState("10");
  const [scenarioKeywords, setScenarioKeywords] = useState("");
  const [scenarioFormat, setScenarioFormat] = useState("");
  const [scenarioConstraints, setScenarioConstraints] = useState("");
  const [creatingScenario, setCreatingScenario] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);

  async function handleCreateScenario(e: React.FormEvent) {
    e.preventDefault();
    if (!scenarioTitle.trim() || !scenarioDesc.trim() || !scenarioObjective.trim()) {
      toast.error("Please fill in the title, description, and objective.");
      return;
    }

    setCreatingScenario(true);
    try {
      const keywords = scenarioKeywords.split(",").map(k => k.trim()).filter(Boolean);
      const constraints = scenarioConstraints.split("\n").map(c => c.trim()).filter(Boolean);
      const expectedTraits = {
        keywords,
        format: scenarioFormat.trim(),
        constraints
      };

      const res = await fetch(`/api/prompt-challenges`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: scenarioTitle,
          description: scenarioDesc,
          objective: scenarioObjective,
          expectedTraits,
          difficulty: scenarioDifficulty,
          category: scenarioCategory,
          estimatedMinutes: parseInt(scenarioEstMin, 10) || 10,
          workspaceId: workspace.id,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      toast.success("Prompt scenario created successfully!");
      
      if (data.scenario) {
        setCurrentPromptScenarios([data.scenario, ...currentPromptScenarios]);
      }

      // Reset form & close
      setScenarioTitle("");
      setScenarioDesc("");
      setScenarioObjective("");
      setScenarioKeywords("");
      setScenarioFormat("");
      setScenarioConstraints("");
      setScenarioEstMin("10");
      setCreatePromptOpen(false);
    } catch (err) {
      toast.error("Failed to create prompt scenario", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCreatingScenario(false);
    }
  }

  async function handleDeleteScenario(id: string) {
    if (!confirm("Are you sure you want to delete this custom scenario?")) return;
    try {
      const res = await fetch(`/api/prompt-challenges/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      toast.success("Scenario deleted successfully!");
      setCurrentPromptScenarios(currentPromptScenarios.filter(s => s.id !== id));
    } catch (err) {
      toast.error("Failed to delete scenario", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Prompt task views" className="self-start inline-flex p-[3px] rounded-[10px] border border-border-strong bg-surface gap-0.5">
        {([
          ["scenarios", "Scenarios", currentPromptScenarios.length],
          ["attempts", "Attempts", promptAttempts.length],
        ] as const).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`inline-flex items-center gap-2 h-8 px-3 rounded-[7px] text-[13px] font-medium transition ${view === id ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}
          >
            {label}
            <span className={`text-xs tabular-nums ${view === id ? "text-secondary-soft" : "text-subtle"}`}>{n}</span>
          </button>
        ))}
      </div>
      {view === "attempts" && <PromptAttemptsSection promptAttempts={promptAttempts} onSelectAttempt={setSelectedAttempt} sessions={[]} />}
      {view === "scenarios" && (
        <ScenarioLibrarySection
          promptScenarios={currentPromptScenarios}
          workspaceId={workspace.id}
          slug={workspace.slug}
          onOpenCreateModal={() => setCreatePromptOpen(true)}
          onDeleteScenario={handleDeleteScenario}
        />
      )}

      {/* Custom Prompt Scenario Creation Modal */}
      {createPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-panel/30">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-secondary animate-pulse" />
                <h2 className="text-base font-semibold text-fg">Create custom prompt scenario</h2>
              </div>
              <button
                onClick={() => setCreatePromptOpen(false)}
                className="p-1 rounded-md hover:bg-panel text-muted hover:text-fg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateScenario} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Scenario title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Write a Rest API Spec Generator prompt"
                    value={scenarioTitle}
                    onChange={(e) => setScenarioTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Estimated Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={scenarioEstMin}
                    onChange={(e) => setScenarioEstMin(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Category</label>
                  <select
                    value={scenarioCategory}
                    onChange={(e) => setScenarioCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                  >
                    <option value="code-generation">Code generation</option>
                    <option value="debugging">Debugging</option>
                    <option value="api-design">API Design</option>
                    <option value="data-analysis">Data analysis</option>
                    <option value="system-design">System design</option>
                    <option value="creative">Creative / Docs</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Difficulty</label>
                  <select
                    value={scenarioDifficulty}
                    onChange={(e) => setScenarioDifficulty(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">Scenario Description (Markdown support)</label>
                <p className="text-xs text-muted -mt-0.5">Describe the context, the system setting, or the background information.</p>
                <textarea
                  required
                  placeholder="Provide background context here..."
                  value={scenarioDesc}
                  onChange={(e) => setScenarioDesc(e.target.value)}
                  className="w-full h-24 p-3 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40 resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">Objective / Task Goal</label>
                <p className="text-xs text-muted -mt-0.5">Explain exactly what the user's prompt needs to achieve.</p>
                <textarea
                  required
                  placeholder="State the objective clearly..."
                  value={scenarioObjective}
                  onChange={(e) => setScenarioObjective(e.target.value)}
                  className="w-full h-20 p-3 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40 resize-y"
                />
              </div>

              <div className="border-t border-border/60 pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-fg flex items-center gap-1.5 text-secondary">
                  <Sparkles className="w-3.5 h-3.5" /> Grading Helper Traits (Keywords & Constraints)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Expected Keywords (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g., sort, filter, pagination, typescript"
                      value={scenarioKeywords}
                      onChange={(e) => setScenarioKeywords(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Output format expectation</label>
                    <input
                      type="text"
                      placeholder="e.g., JSON, markdown codeblock, yaml"
                      value={scenarioFormat}
                      onChange={(e) => setScenarioFormat(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Negative Constraints (One per line)</label>
                  <p className="text-xs text-muted -mt-0.5">Things the prompt must avoid or instruct the AI not to do.</p>
                  <textarea
                    placeholder="e.g., No external styling libraries&#10;Do not use inline styles"
                    value={scenarioConstraints}
                    onChange={(e) => setScenarioConstraints(e.target.value)}
                    className="w-full h-16 p-3 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40 resize-y"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setCreatePromptOpen(false)}
                  className="px-4 py-2 rounded-md border border-border text-xs font-medium text-muted hover:text-fg hover:bg-panel transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingScenario}
                  className="px-4 py-2 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {creatingScenario ? "Creating..." : "Create scenario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Attempt Feedback Review Modal */}
      {selectedAttempt && (() => {
        const rubric = selectedAttempt.rubricScores
          ? (typeof selectedAttempt.rubricScores === "string"
              ? JSON.parse(selectedAttempt.rubricScores)
              : selectedAttempt.rubricScores)
          : { clarity: 0, specificity: 0, efficiency: 0, context: 0, constraints: 0, edgeCases: 0 };
        
        const candidateName = getCandidateNameFromSession(selectedAttempt);
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-3xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-panel/30">
                <div className="flex items-center gap-2.5">
                  <Brain className="w-5 h-5 text-secondary animate-pulse" />
                  <div>
                    <h2 className="text-base font-semibold text-fg">Prompt evaluation review</h2>
                    <p className="text-xs text-muted mt-0.5">
                      Candidate: <span className="text-fg font-medium">{candidateName}</span> &bull; Scenario: <span className="text-fg font-medium">{selectedAttempt.scenarioTitle}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="p-1 rounded-md hover:bg-panel text-muted hover:text-fg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Score Summary Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left: Overall score circle */}
                  <div className="bg-panel/20 border border-border/60 rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-xs font-semibold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">
                      <Sparkles className="w-2.5 h-2.5" /> {selectedAttempt.graderType === "ai" ? "Gemini AI" : "Rules grader"}
                    </div>
                    
                    <span className="text-xs font-bold text-muted ">Overall score</span>
                    <div className="relative flex items-center justify-center my-2">
                      <div className="text-4xl font-semibold text-secondary">{selectedAttempt.score ?? 0}</div>
                      <div className="text-xs text-muted/60 self-end mb-1">/100</div>
                    </div>
                    <span className="text-xs text-muted mt-1">
                      {selectedAttempt.durationSec ? `${Math.round(selectedAttempt.durationSec / 60)}m taken` : "Untimed"} &bull; {selectedAttempt.tokenEstimate} tokens
                    </span>
                  </div>

                  {/* Right: Dimension rubric breakdowns */}
                  <div className="md:col-span-2 bg-panel/10 border border-border/40 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-fg tracking-wide">6-Dimension Rubric Evaluation</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                      {Object.entries({
                        Clarity: rubric.clarity,
                        Specificity: rubric.specificity,
                        Efficiency: rubric.efficiency,
                        Context: rubric.context,
                        Constraints: rubric.constraints,
                        "Edge Cases": rubric.edgeCases
                      }).map(([key, val]) => {
                        const score = Number(val || 0);
                        let barColor = "bg-danger";
                        if (score >= 75) barColor = "bg-success";
                        else if (score >= 50) barColor = "bg-warning";
                        
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted font-medium">{key}</span>
                              <span className="text-fg font-semibold">{score}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* AI Feedback */}
                {selectedAttempt.feedback && (
                  <div className="bg-secondary/[0.03] border border-secondary/20 rounded-xl p-4 space-y-2">
                    <h3 className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Evaluator Feedback Insights
                    </h3>
                    <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedAttempt.feedback}
                    </p>
                  </div>
                )}

                {/* Submitted Prompt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-fg">Candidate's Prompt</h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedAttempt.promptText);
                        toast.success("Prompt copied to clipboard!");
                      }}
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg hover:bg-panel px-2 py-1 rounded border border-border/40 transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Copy Prompt
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-fg leading-relaxed bg-bg border border-border rounded-lg p-4 max-h-[220px] overflow-y-auto whitespace-pre-wrap select-text selection:bg-secondary/25">
                    {selectedAttempt.promptText}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end bg-panel/30 border-t border-border px-6 py-4">
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="px-4 py-2 bg-secondary hover:brightness-110 text-bg rounded-md text-xs font-semibold transition-colors"
                >
                  Close review
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getCandidateNameFromSession(attempt: PromptAttemptItem, _sessions?: unknown) {
  return attempt.candidateName ?? "Practice user";
}

interface PromptAttemptsSectionProps {
  promptAttempts: PromptAttemptItem[];
  onSelectAttempt: (attempt: PromptAttemptItem) => void;
  sessions: any[];
}

export function PromptAttemptsSection({
  promptAttempts,
  onSelectAttempt,
  sessions,
}: PromptAttemptsSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredAttempts = useMemo(() => {
    return promptAttempts.filter((a) => {
      const name = getCandidateNameFromSession(a, sessions).toLowerCase();
      const title = a.scenarioTitle.toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || title.includes(term);
    });
  }, [promptAttempts, searchTerm, sessions]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">Prompt evaluation roster</h3>
          <p className="text-xs text-muted mt-0.5">Review submissions from candidates and developers.</p>
        </div>
        <div className="w-full sm:w-64 relative">
          <input
            type="text"
            placeholder="Search candidate or scenario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-bg text-fg text-xs focus:outline-none focus:border-secondary/40"
          />
          <Search className="w-3.5 h-3.5 text-muted/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {filteredAttempts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-panel text-muted/40">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-fg">No attempts found</h4>
            <p className="text-xs text-muted mt-1 max-w-[280px] mx-auto leading-relaxed">
              When candidates complete prompt engineering rounds, their detailed scores and feedback will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-panel/30 text-xs font-semibold text-muted select-none">
                  <th className="px-4 py-3 align-middle font-semibold">Candidate</th>
                  <th className="px-4 py-3 align-middle font-semibold">Scenario</th>
                  <th className="px-4 py-3 align-middle font-semibold">Score</th>
                  <th className="px-4 py-3 align-middle font-semibold">Tokens</th>
                  <th className="px-4 py-3 align-middle font-semibold">Grader</th>
                  <th className="px-4 py-3 align-middle font-semibold">Submitted at</th>
                  <th className="px-4 py-3 align-middle text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredAttempts.map((a) => {
                  const name = getCandidateNameFromSession(a, sessions);
                  const isSession = !!a.sessionId;
                  
                  // Score styling
                  const score = a.score ?? 0;
                  let scoreColor = "text-danger bg-danger/10 border-danger/20";
                  if (score >= 75) scoreColor = "text-success bg-success/10 border-success/20";
                  else if (score >= 50) scoreColor = "text-warning bg-warning/10 border-warning/20";

                  return (
                    <tr key={a.id} className="hover:bg-panel/10 text-xs transition-colors group">
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-col">
                          <span className="font-semibold text-fg group-hover:text-secondary transition-colors">{name}</span>
                          <span className="text-xs text-muted mt-0.5 font-mono">
                            {isSession ? "Interview session" : "Practice mode"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex flex-col">
                          <span className="font-medium text-fg">{a.scenarioTitle}</span>
                          <span className="text-xs text-muted mt-0.5 capitalize">
                            {a.scenarioCategory.replace("-", " ")} &bull; {a.scenarioDifficulty}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-bold ${scoreColor}`}>
                          {a.score !== null ? `${a.score}%` : "Ungraded"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle font-mono text-xs text-muted">
                        {a.tokenEstimate}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        {a.graderType === "ai" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary">
                            <Sparkles className="w-2.5 h-2.5" /> Gemini AI
                          </span>
                        ) : (
                          <span className="text-xs text-muted">Rules engine</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-muted">
                        {new Date(a.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right">
                        <button
                          onClick={() => onSelectAttempt(a)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/10 border border-secondary/25 text-xs font-semibold text-secondary hover:bg-secondary/15 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface ScenarioLibrarySectionProps {
  promptScenarios: PromptScenario[];
  workspaceId: string;
  slug: string;
  onOpenCreateModal: () => void;
  onDeleteScenario?: (id: string) => void;
}

export function ScenarioLibrarySection({
  promptScenarios,
  workspaceId,
  slug,
  onOpenCreateModal,
  onDeleteScenario,
}: ScenarioLibrarySectionProps) {
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredScenarios = useMemo(() => {
    return promptScenarios.filter((s) => {
      const matchDiff = difficultyFilter === "all" || s.difficulty === difficultyFilter;
      const matchCat = categoryFilter === "all" || s.category === categoryFilter;
      return matchDiff && matchCat;
    });
  }, [promptScenarios, difficultyFilter, categoryFilter]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">Prompt challenges library</h3>
          <p className="text-xs text-muted mt-0.5">Manage custom challenges or review platform built-in ones.</p>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:brightness-110 text-bg text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create custom scenario
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center bg-panel/10 p-2 border border-border/40 rounded-lg">
        <span className="text-xs font-bold text-muted px-2">Filters:</span>
        
        {/* Difficulty */}
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-2 py-1 bg-bg border border-border rounded text-xs text-muted focus:outline-none"
        >
          <option value="all">All difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        {/* Category */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2 py-1 bg-bg border border-border rounded text-xs text-muted focus:outline-none"
        >
          <option value="all">All categories</option>
          <option value="code-generation">Code generation</option>
          <option value="debugging">Debugging</option>
          <option value="api-design">API Design</option>
          <option value="data-analysis">Data analysis</option>
          <option value="system-design">System design</option>
          <option value="creative">Creative / Docs</option>
        </select>

        <span className="text-xs text-muted/60 ml-auto pr-2 font-mono">
          Showing {filteredScenarios.length} scenarios
        </span>
      </div>

      {filteredScenarios.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-panel text-muted/40">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-fg">No scenarios match your filters</h4>
            <p className="text-xs text-muted mt-1">Try adjusting your filters or create a custom one.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredScenarios.map((s) => {
            const isCustom = s.workspaceId !== null;
            
            // Diff badge
            let diffColor = "text-success bg-success/10 border-success/20";
            if (s.difficulty === "intermediate") diffColor = "text-warning bg-warning/10 border-warning/20";
            else if (s.difficulty === "advanced") diffColor = "text-danger bg-danger/10 border-danger/20";

            return (
              <div
                key={s.id}
                className="group relative flex flex-col bg-surface border border-border hover:border-secondary/40 rounded-xl p-5 hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border ${diffColor}`}>
                      {humanize(s.difficulty)}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-panel/60 border border-border text-muted ">
                      {s.category.replace("-", " ")}
                    </span>
                  </div>
                  
                  {isCustom ? (
                    <span className="text-xs font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded border border-secondary/20 animate-pulse">
                      Custom
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted bg-panel px-1.5 py-0.5 rounded border border-border ">
                      Platform Built-in
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-fg group-hover:text-secondary transition-colors mt-3">
                  {s.title}
                </h4>

                <p className="text-xs text-muted mt-2 line-clamp-2 leading-relaxed">
                  {s.description}
                </p>

                <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted">
                  <div className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-muted/60" />
                    <span>Est. {s.estimatedMinutes} mins</span>
                  </div>

                  {isCustom && onDeleteScenario && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteScenario(s.id);
                      }}
                      className="inline-flex items-center gap-1 text-danger hover:text-danger hover:bg-danger/10 px-2 py-1 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



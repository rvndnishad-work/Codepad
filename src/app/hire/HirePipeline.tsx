import {
  ArrowRight,
  Bot,
  ClipboardCheck,
  FileCode2,
  Gauge,
  GitBranch,
  MonitorPlay,
  Radar,
  ScrollText,
  ShieldCheck,
  Timer,
  Users,
  Workflow,
} from "lucide-react";

/**
 * The hiring pipeline, stage by stage — maps every recruiter-facing feature to
 * the funnel step where it earns its keep. Pure presentational server
 * component; the deep-dive demos live below in HomeRecruiterFeatures.
 */

const STAGES: {
  step: string;
  title: string;
  tagline: string;
  tile: string;
  glow: string;
  hover: string;
  icon: React.ComponentType<{ className?: string }>;
  features: { icon: React.ComponentType<{ className?: string }>; text: string }[];
}[] = [
  {
    step: "01",
    title: "Create",
    tagline: "Assessments in minutes, not sprints",
    tile: "bg-gradient-to-br from-indigo-500 to-violet-600",
    glow: "bg-indigo-500/20",
    hover: "hover:border-indigo-400/50 hover:shadow-indigo-500/15",
    icon: FileCode2,
    features: [
      { icon: ClipboardCheck, text: "160+ curated challenges ready to assign" },
      { icon: ScrollText, text: "Custom rubrics & structured scorecards" },
      { icon: Workflow, text: "Author your own via MCP or the editor" },
    ],
  },
  {
    step: "02",
    title: "Screen",
    tagline: "Volume handled before your calendar is",
    tile: "bg-gradient-to-br from-fuchsia-500 to-purple-600",
    glow: "bg-fuchsia-500/20",
    hover: "hover:border-fuchsia-400/50 hover:shadow-fuchsia-500/15",
    icon: Bot,
    features: [
      { icon: Bot, text: "AI screening interviews at batch scale" },
      { icon: Timer, text: "Take-homes with server-side grading" },
      { icon: Gauge, text: "Auto-scored attempts, instant shortlists" },
    ],
  },
  {
    step: "03",
    title: "Interview",
    tagline: "The live room, nothing to install",
    tile: "bg-gradient-to-br from-amber-500 to-orange-600",
    glow: "bg-amber-500/20",
    hover: "hover:border-amber-400/50 hover:shadow-amber-500/15",
    icon: MonitorPlay,
    features: [
      { icon: Users, text: "Multiplayer editor with live cursors" },
      { icon: FileCode2, text: "Real execution in 8 languages" },
      { icon: MonitorPlay, text: "Every keystroke captured for replay" },
    ],
  },
  {
    step: "04",
    title: "Decide",
    tagline: "Evidence, not vibes",
    tile: "bg-gradient-to-br from-emerald-500 to-teal-600",
    glow: "bg-emerald-500/20",
    hover: "hover:border-emerald-400/50 hover:shadow-emerald-500/15",
    icon: ShieldCheck,
    features: [
      { icon: Radar, text: "Integrity report & AI-suspicion radar" },
      { icon: ScrollText, text: "Rubric scores side-by-side per candidate" },
      { icon: GitBranch, text: "Sync verdicts to Greenhouse, Lever, Ashby" },
    ],
  },
];

export default function HirePipeline() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 space-y-12">
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-widest">
            <Workflow className="w-3.5 h-3.5" />
            The pipeline
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-fg leading-[1.05]">
            One workspace, <br className="hidden sm:block" />
            every stage of the funnel.
          </h2>
          <p className="text-sm md:text-base text-muted font-medium max-w-xl mx-auto leading-relaxed">
            From the first screen to the signed offer — no tool-hopping, no
            &ldquo;can you see my screen?&rdquo;, no lost context between stages.
          </p>
        </div>

        {/* Stage cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STAGES.map((stage, i) => {
            const StageIcon = stage.icon;
            return (
              <div
                key={stage.step}
                className={`group relative rounded-3xl border border-border bg-surface overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${stage.hover}`}
              >
                <div
                  className={`absolute -top-20 -right-20 w-52 h-52 rounded-full blur-[80px] opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${stage.glow}`}
                />
                {/* Ghost step number */}
                <span
                  aria-hidden
                  className="absolute -bottom-6 -right-1 text-[6.5rem] leading-none font-black text-fg opacity-[0.04] select-none pointer-events-none"
                >
                  {stage.step}
                </span>

                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg ${stage.tile}`}
                    >
                      <StageIcon className="w-6 h-6" />
                    </div>
                    {/* Connector to the next stage (desktop only) */}
                    {i < STAGES.length - 1 && (
                      <ArrowRight className="hidden lg:block w-5 h-5 text-muted/30 group-hover:text-muted/70 group-hover:translate-x-1 transition-all" />
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted/60">
                      Step {stage.step}
                    </div>
                    <h3 className="text-lg font-extrabold text-fg tracking-tight">
                      {stage.title}
                    </h3>
                    <p className="text-[11px] text-muted font-semibold mt-0.5">
                      {stage.tagline}
                    </p>
                  </div>

                  <ul className="space-y-2.5 pt-1">
                    {stage.features.map((f) => {
                      const FeatureIcon = f.icon;
                      return (
                        <li key={f.text} className="flex items-start gap-2.5">
                          <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-md bg-panel border border-border/60 flex items-center justify-center text-muted">
                            <FeatureIcon className="w-3 h-3" />
                          </span>
                          <span className="text-xs text-fg/90 font-medium leading-relaxed">
                            {f.text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

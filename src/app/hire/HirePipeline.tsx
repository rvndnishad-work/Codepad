import {
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
import RevealOnScroll from "@/components/scroll/RevealOnScroll";
import SignalStrip from "@/components/home/SignalStrip";
import SectionHeading from "@/components/home/SectionHeading";

/**
 * The hiring pipeline, stage by stage — maps every recruiter-facing feature to
 * the funnel step where it earns its keep. Presentational server component;
 * entrance motion comes from the shared RevealOnScroll primitives, and all
 * accents run through the `secondary` token.
 */

const STAGES: {
  step: string;
  title: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  features: { icon: React.ComponentType<{ className?: string }>; text: string }[];
}[] = [
  {
    step: "01",
    title: "Create",
    tagline: "Assessments in minutes, not sprints",
    icon: FileCode2,
    features: [
      { icon: ClipboardCheck, text: "Curated challenge library, ready to assign" },
      { icon: ScrollText, text: "Custom rubrics & structured scorecards" },
      { icon: Workflow, text: "Author your own via MCP or the editor" },
    ],
  },
  {
    step: "02",
    title: "Screen",
    tagline: "Volume handled before your calendar is",
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
    icon: MonitorPlay,
    features: [
      { icon: Users, text: "Multiplayer editor with live cursors" },
      { icon: FileCode2, text: "Real execution in 8 languages" },
      { icon: MonitorPlay, text: "Full session replay with integrity signals" },
    ],
  },
  {
    step: "04",
    title: "Decide",
    tagline: "Evidence, not vibes",
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
    <section className="relative border-b border-border py-20 md:py-28">
      <div className="relative mx-auto max-w-6xl px-4">
        <SectionHeading
          index="02"
          tone="secondary"
          eyebrow="The pipeline"
          eyebrowIcon={<Workflow className="h-3 w-3" />}
          title="One workspace,"
          highlight="every stage of the funnel."
          lede="From the first screen to the signed offer — no tool-hopping, no lost context between stages, and one record you can point at afterwards."
        />

        {/* The motif, at full width, standing in for the funnel itself. */}
        <RevealOnScroll className="mb-8">
          <SignalStrip
            tone="secondary"
            stages={STAGES.map((s, i) => ({
              label: s.title,
              state: i === 0 ? "done" : i === 1 ? "live" : undefined,
            }))}
          />
        </RevealOnScroll>

        {/* Stage sheet: four columns divided by hairlines, each one a clause
            with its number, its claim, and the mechanisms under it. */}
        <RevealOnScroll className="ip-frame ip-ticks ip-ticks-secondary grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage) => {
            const StageIcon = stage.icon;
            return (
              <div key={stage.step} className="flex flex-col gap-5 bg-surface p-6">
                <div className="flex items-center gap-3">
                  <span className="ip-index text-secondary">{stage.step}</span>
                  <span className="ip-rule-soft min-w-2 flex-1" aria-hidden />
                  <StageIcon className="h-4 w-4 shrink-0 text-subtle" />
                </div>

                <div>
                  <h3 className="ip-display ip-display-md text-fg">{stage.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{stage.tagline}</p>
                </div>

                <ul className="mt-auto divide-y divide-border border-t border-border">
                  {stage.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5 py-2.5">
                      <span
                        aria-hidden
                        className="mt-[7px] h-[5px] w-[5px] shrink-0 border border-secondary"
                      />
                      <span className="text-[12.5px] leading-snug text-fg">{f.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </RevealOnScroll>
      </div>
    </section>
  );
}

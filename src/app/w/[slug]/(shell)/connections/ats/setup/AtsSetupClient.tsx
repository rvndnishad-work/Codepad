"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { SETUP_STEPS, type AtsSettings } from "@/lib/ats/settings";
import { connectGreenhouseAction, finishSetupAction, saveTriggerStageAction, saveWritebackAction, testImportAction } from "../../actions";
import { btn, btnPrimary, input } from "../../ui";
import MappingEditor, { type MappingRow, type ScreeningChoice } from "../MappingEditor";
import KeyPanel from "../KeyPanel";

type Props = {
  slug: string;
  step: number;
  connected: boolean;
  settings: AtsSettings;
  rows: MappingRow[];
  screenings: ScreeningChoice[];
  partnerBaseUrl: string;
};

const AFTER: Record<number, string[]> = {
  1: [
    "You create a key here and paste it into Greenhouse.",
    "Greenhouse lists your mapped jobs as Codepad tests.",
    "You add the test to a stage of each job's interview plan.",
  ],
  2: [
    "A recruiter moves someone to that stage in Greenhouse.",
    "Greenhouse sends us the candidate and the test they need.",
    "We add them to Codepad and send the screening.",
  ],
  3: [
    "Greenhouse moves a candidate to the test stage.",
    "They appear in the batch named after the job, with the source Greenhouse.",
    "Their invite goes out, or waits for you if you chose After I review.",
    "When you pass or do not pass them, Greenhouse gets the result and the profile link.",
  ],
  4: [
    "The candidate finishes the screening.",
    "A recruiter passes or does not pass them in Codepad.",
    "Greenhouse gets the decision, the profile link and, if you choose, the score.",
  ],
  5: ["We run the import for one made-up candidate.", "Nothing is saved and no email goes out.", "You see exactly what would happen."],
};

export default function AtsSetupClient({ slug, step, connected, settings, rows, screenings, partnerBaseUrl }: Props) {
  const router = useRouter();
  const base = `/w/${slug}/connections/ats/setup`;
  const go = (n: number) => router.push(`${base}?step=${n}`);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const stepHint = (i: number): string => {
    if (i === 1) return connected ? "Key created" : SETUP_STEPS[0].hint;
    if (i === 2 && settings.triggerStage) return `Stage: ${settings.triggerStage}`;
    if (i === 3 && rows.some((r) => r.screeningKind !== "none")) return `${rows.filter((r) => r.screeningKind !== "none").length} jobs mapped`;
    return SETUP_STEPS[i - 1].hint;
  };
  const done = (i: number) =>
    i === 1 ? connected : i === 2 ? !!settings.triggerStage : i === 3 ? rows.some((r) => r.screeningKind !== "none") : i === 4 ? step > 4 || settings.setupComplete : settings.setupComplete;

  const connect = () =>
    start(async () => {
      const r = await connectGreenhouseAction(slug);
      if (!r.ok) return void toast.error(r.error);
      setFreshKey(r.key);
      toast.success("Key created");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted flex gap-2">
        <Link href={`/w/${slug}/connections`} className="hover:text-fg">
          Connections
        </Link>
        <span aria-hidden>/</span>
        <span className="text-fg font-medium">Connect Greenhouse</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-7 items-start">
        <ol className="w-full lg:w-[250px] shrink-0 flex flex-col gap-1" aria-label="Setup steps">
          {SETUP_STEPS.map((s, idx) => {
            const i = idx + 1;
            const current = i === step;
            const reachable = connected || i === 1;
            const dot = current ? "bg-secondary text-bg" : done(i) ? "bg-success/10 text-success" : "bg-panel text-muted";
            const body = (
              <>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${dot}`}>
                  {done(i) && !current ? <Check className="w-3.5 h-3.5" aria-label="Done" /> : i}
                </span>
                <span className="flex flex-col">
                  <span className={`text-sm ${current ? "font-semibold text-fg" : "font-medium text-fg"}`}>{s.title}</span>
                  <span className="text-[13px] text-muted">{stepHint(i)}</span>
                </span>
              </>
            );
            return (
              <li key={s.key}>
                {reachable && !current ? (
                  <Link href={`${base}?step=${i}`} className="flex gap-3 items-start px-3 py-2.5 rounded-[10px] hover:bg-panel">
                    {body}
                  </Link>
                ) : (
                  <div aria-current={current ? "step" : undefined} className={`flex gap-3 items-start px-3 py-2.5 rounded-[10px] ${current ? "bg-surface border border-border" : "opacity-70"}`}>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <section className="flex-1 min-w-0 flex flex-col gap-5">
          {step === 1 && (
            <>
              <Heading title="Connect Greenhouse" text="Codepad works as a Greenhouse assessment partner. Create a key here, then add it in Greenhouse so it can send candidates and read results." />
              {connected ? (
                <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
                  <KeyPanel slug={slug} baseUrl={partnerBaseUrl} freshKey={freshKey} canManage />
                  {freshKey && <p className="text-[13px] text-warning">Copy the key now. You can reveal it again later from Settings.</p>}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-3 items-start">
                  <p className="text-sm text-fg">One ATS per workspace. Creating the key connects Greenhouse; nothing is imported until you map a job.</p>
                  <button type="button" className={btnPrimary} onClick={connect} disabled={busy}>
                    {busy ? "Creating" : "Create key"}
                  </button>
                </div>
              )}
              <Footer back={null} next={connected ? () => go(2) : null} />
            </>
          )}

          {step === 2 && <StageStep slug={slug} initial={settings.triggerStage} onBack={() => go(1)} onNext={() => go(3)} />}

          {step === 3 && (
            <>
              <Heading
                title="Which screening does each job get?"
                text={`When a candidate reaches ${settings.triggerStage || "the test stage"} in Greenhouse, we add them to a batch named after the job and send the screening you pick here. Jobs set to Do nothing are ignored.`}
              />
              <MappingEditor
                slug={slug}
                providerName="Greenhouse"
                triggerStage={settings.triggerStage}
                rows={rows}
                screenings={screenings}
                canManage
                saveLabel="Save and continue"
                onSaved={() => go(4)}
                footerStart={
                  <button type="button" className={btn} onClick={() => go(2)}>
                    Back
                  </button>
                }
              />
            </>
          )}

          {step === 4 && <WritebackStep slug={slug} initial={settings.sendScore} onBack={() => go(3)} onNext={() => go(5)} />}

          {step === 5 && <TestStep slug={slug} rows={rows} onBack={() => go(4)} onFinish={() => router.push(`/w/${slug}/connections/ats`)} />}
        </section>

        <aside className="w-full lg:w-[300px] shrink-0 flex flex-col gap-3.5">
          <div className="rounded-xl border border-border bg-surface p-[18px] flex flex-col gap-2.5">
            <span className="text-[13px] font-semibold text-muted">What happens next</span>
            <ol className="list-decimal pl-[18px] flex flex-col gap-2 text-[13.5px] text-fg leading-relaxed">
              {(AFTER[step] ?? AFTER[3]).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-secondary bg-secondary/10 p-4 text-[13.5px] leading-relaxed text-fg">
            Scores never pass anyone by themselves. Greenhouse only hears Passed after a recruiter decides in Codepad.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Heading({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
      <p className="text-sm text-muted max-w-[640px]">{text}</p>
    </div>
  );
}

function Footer({ back, next, nextLabel = "Continue", busy }: { back: (() => void) | null; next: (() => void) | null; nextLabel?: string; busy?: boolean }) {
  return (
    <div className="flex justify-between items-center border-t border-border pt-4">
      <div>
        {back && (
          <button type="button" className={btn} onClick={back}>
            Back
          </button>
        )}
      </div>
      {next && (
        <button type="button" className={btnPrimary} onClick={next} disabled={busy}>
          {nextLabel}
        </button>
      )}
    </div>
  );
}

function StageStep({ slug, initial, onBack, onNext }: { slug: string; initial: string; onBack: () => void; onNext: () => void }) {
  const [stage, setStage] = useState(initial);
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const save = () =>
    start(async () => {
      const r = await saveTriggerStageAction(slug, stage);
      if (!r.ok) return void setError(r.error);
      onNext();
    });
  return (
    <>
      <Heading
        title="When should Greenhouse send a candidate?"
        text="In Greenhouse, add the Codepad test to one stage of each job's interview plan. Candidates are sent to us when they reach that stage. Name the stage here so your team knows where imports come from."
      />
      <label className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-1.5 max-w-xl">
        <span className="text-[13px] font-medium text-muted">Greenhouse stage</span>
        <input className={input} value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Technical screen" />
        {error && (
          <span role="alert" className="text-[13px] text-danger">
            {error}
          </span>
        )}
      </label>
      <Footer back={onBack} next={save} busy={busy} />
    </>
  );
}

function WritebackStep({ slug, initial, onBack, onNext }: { slug: string; initial: boolean; onBack: () => void; onNext: () => void }) {
  const [sendScore, setSendScore] = useState(initial);
  const [busy, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await saveWritebackAction(slug, { sendScore });
      if (!r.ok) return void toast.error(r.error);
      onNext();
    });
  return (
    <>
      <Heading title="What goes back to Greenhouse?" text="Greenhouse hears back once a recruiter passes or does not pass the candidate and the screening is closed. Until then it sees the screening as in progress." />
      <div className="rounded-xl border border-border bg-surface divide-y divide-border max-w-2xl">
        <Row title="Decision" text="Passed or Not passed, exactly as a recruiter set it." fixed />
        <Row title="Profile link" text="A link to the candidate in Codepad, with every result and note." fixed />
        <label className="flex items-start gap-3 px-5 py-4">
          <input type="checkbox" className="mt-0.5 w-4 h-4 accent-secondary" checked={sendScore} onChange={(e) => setSendScore(e.target.checked)} />
          <span className="flex flex-col">
            <span className="text-sm font-medium text-fg">Score</span>
            <span className="text-[13px] text-muted">The screening score, 0 to 100. Leave it off if you only want decisions in Greenhouse.</span>
          </span>
        </label>
      </div>
      <Footer back={onBack} next={save} busy={busy} />
    </>
  );
}

function Row({ title, text, fixed }: { title: string; text: string; fixed?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <Check className="w-4 h-4 mt-0.5 text-success shrink-0" aria-hidden />
      <span className="flex flex-col">
        <span className="text-sm font-medium text-fg">
          {title}
          {fixed && <span className="text-[13px] font-normal text-muted"> (always sent)</span>}
        </span>
        <span className="text-[13px] text-muted">{text}</span>
      </span>
    </div>
  );
}

function TestStep({ slug, rows, onBack, onFinish }: { slug: string; rows: MappingRow[]; onBack: () => void; onFinish: () => void }) {
  const saved = rows.filter((r) => r.id);
  const [mappingId, setMappingId] = useState(saved.find((r) => r.screeningKind !== "none")?.id ?? saved[0]?.id ?? "");
  const [name, setName] = useState("Test Candidate");
  const [email, setEmail] = useState("test.candidate@example.com");
  const [lines, setLines] = useState<string[] | null>(null);
  const [busy, start] = useTransition();

  const run = () =>
    start(async () => {
      const r = await testImportAction(slug, { mappingId, name, email });
      if (!r.ok) return void toast.error(r.error);
      setLines(r.lines);
    });
  const finish = () =>
    start(async () => {
      const r = await finishSetupAction(slug);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Greenhouse is ready");
      onFinish();
    });

  return (
    <>
      <Heading title="Test with one candidate" text="See what an import would do. Nothing is saved and no email goes out." />
      {saved.length === 0 ? (
        <p className="text-sm text-muted">Map at least one job first.</p>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5 grid gap-3 sm:grid-cols-3 max-w-3xl">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Job</span>
            <select className={input} value={mappingId} onChange={(e) => setMappingId(e.target.value)}>
              {saved.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.jobName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Name</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Email</span>
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <div className="sm:col-span-3">
            <button type="button" className={btn} onClick={run} disabled={busy || !mappingId}>
              Run the test
            </button>
          </div>
        </div>
      )}
      {lines && (
        <ol className="rounded-xl border border-border bg-surface p-5 list-decimal pl-9 flex flex-col gap-1.5 text-sm text-fg max-w-3xl" aria-live="polite">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ol>
      )}
      <Footer back={onBack} next={finish} nextLabel="Finish setup" busy={busy} />
    </>
  );
}

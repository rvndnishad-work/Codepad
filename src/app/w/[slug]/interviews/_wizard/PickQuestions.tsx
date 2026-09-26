"use client";

/**
 * Pick the questions for an interview that was scheduled with "a teammate
 * picks later", or change them before it starts.
 */
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarClock, Check, Lock, MessageSquareQuote, Save, UserRound } from "lucide-react";
import { formatOf, stepIssues, type FormatId, type QuestionPlan, type WizardRound, type GuideOption, type MemberOption, type RoundOption } from "@/lib/interview/wizard";
import { Btn, useToasts } from "../../candidates/_components/ui";
import { setInterviewQuestionsAction } from "../actions";
import QuestionsPicker, { type QuestionsValue } from "./QuestionsPicker";
import { FORMAT_ICON } from "./Steps";
import { Chip, Switch, fmtMinutes, spring } from "./parts";

export default function PickQuestions({
  slug,
  sessionId,
  meId,
  canEdit,
  locked,
  formatId,
  summary,
  initial,
  siblings,
  roundOptions,
  guides,
  members,
}: {
  slug: string;
  sessionId: string;
  meId: string;
  canEdit: boolean;
  locked: boolean;
  formatId: FormatId;
  summary: { title: string; candidate: string | null; host: string; when: string | null; minutes: number; requestedBy: string | null; note: string | null; owner: string | null };
  initial: { plan: QuestionPlan; rounds: WizardRound[]; guideId: string | null };
  siblings: number;
  roundOptions: RoundOption[];
  guides: GuideOption[];
  members: MemberOption[];
}) {
  const router = useRouter();
  const format = formatOf(formatId)!;
  const Icon = FORMAT_ICON[format.id];
  const [value, setValue] = useState<QuestionsValue>({ ...initial, questionsOwnerId: null, questionsNote: "" });
  const [all, setAll] = useState(siblings > 0);
  const [pending, start] = useTransition();
  const [toasts, toast] = useToasts();
  const [saved, setSaved] = useState(false);

  const issues = stepIssues(
    {
      format: format.id,
      title: summary.title,
      candidates: [],
      noCandidate: true,
      hostId: meId,
      panelIds: [],
      plan: value.plan,
      rounds: value.rounds,
      guideId: value.guideId,
      questionsOwnerId: null,
      questionsNote: "",
      minutes: summary.minutes,
      times: [],
      brief: "",
      candidateBrief: "",
      sendInvites: false,
    },
    "questions",
  );

  const save = () =>
    start(async () => {
      const res = await setInterviewQuestionsAction(slug, sessionId, {
        plan: value.plan === "open" ? "open" : "set",
        rounds: value.rounds.map((r) => ({ kind: r.kind, id: r.id })),
        guideId: value.guideId,
        applyToSiblings: all,
      });
      if (!res.ok) return toast(res.error, "error");
      setSaved(true);
      toast(res.updated > 1 ? `Questions saved for ${res.updated} interviews` : "Questions saved");
      router.refresh();
      setTimeout(() => router.push(`/w/${slug}/interviews`), 900);
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href={`/w/${slug}/interviews`} aria-label="Back to Interviews" className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center text-muted hover:text-fg hover:bg-panel">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-fg leading-tight">Pick the questions</h1>
          <p className="text-[13px] text-muted truncate">{summary.title}</p>
        </div>
      </div>

      <section
        className="rounded-2xl border border-border bg-surface p-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] items-start"
        style={{ backgroundImage: "radial-gradient(420px 180px at 0% 0%, rgb(var(--c-accent-2) / 0.16), transparent 70%)" }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary-soft flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" aria-hidden />
          </span>
          <div className="min-w-0 flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold text-fg">{format.label}</span>
              <Chip>{fmtMinutes(summary.minutes)}</Chip>
              {siblings > 0 && <Chip tone="indigo">{siblings + 1} candidates</Chip>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="w-3.5 h-3.5" aria-hidden />
                {summary.candidate ?? "Open link"}, hosted by {summary.host}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" aria-hidden />
                {summary.when ? new Date(summary.when).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "No time yet"}
              </span>
            </div>
          </div>
        </div>
        {summary.note && (
          <div className="rounded-xl border border-border bg-bg/60 px-4 py-3 max-w-[380px] flex gap-2.5">
            <MessageSquareQuote className="w-4 h-4 text-secondary-soft shrink-0 mt-0.5" aria-hidden />
            <p className="text-[13px] text-fg leading-relaxed">
              {summary.note}
              {summary.requestedBy && <span className="block text-xs text-subtle mt-1">From {summary.requestedBy}</span>}
            </p>
          </div>
        )}
      </section>

      {locked ? (
        <div className="rounded-xl border border-border bg-surface p-6 flex items-center gap-3 text-[14px] text-muted">
          <Lock className="w-4 h-4 text-subtle" aria-hidden />
          This interview has started or finished, so its questions can no longer change.
        </div>
      ) : !canEdit ? (
        <div className="rounded-xl border border-border bg-surface p-6 flex items-center gap-3 text-[14px] text-muted">
          <Lock className="w-4 h-4 text-subtle" aria-hidden />
          {summary.owner ? `${summary.owner} was asked to pick these questions.` : "Only the interviewers or someone who schedules interviews can change these questions."}
        </div>
      ) : (
        <>
          <QuestionsPicker
            slug={slug}
            format={format}
            value={value}
            onChange={(p) => setValue((v) => ({ ...v, ...p }))}
            roundOptions={roundOptions}
            guides={guides}
            members={members}
            meId={meId}
            allowLater={false}
          />
          <div className="sticky bottom-0 z-30 -mx-4 md:-mx-10 -mb-6 md:-mb-8 border-t border-border bg-bg/85 backdrop-blur">
            <div className="px-4 md:px-10 min-h-[68px] py-3 flex flex-wrap items-center justify-between gap-3">
              {siblings > 0 ? (
                <Switch on={all} onChange={setAll} label={`Use for all ${siblings + 1} interviews`} hint="Everyone scheduled in the same setup gets these questions." />
              ) : (
                <span className="text-[13px] text-subtle">{issues[0] ?? "Ready to save."}</span>
              )}
              <Btn size="md" variant="primary" onClick={save} disabled={pending || issues.length > 0 || saved} className="min-w-[150px]">
                {saved ? (
                  <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={spring} className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" aria-hidden /> Saved
                  </motion.span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" aria-hidden />
                    {pending ? "Saving" : "Save questions"}
                  </>
                )}
              </Btn>
            </div>
          </div>
        </>
      )}
      {toasts}
    </div>
  );
}

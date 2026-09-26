"use client";

/**
 * The questions step: pick them now, hand them to a teammate, or run the
 * interview without set questions. Also used on its own by the teammate
 * who picks the questions later.
 */
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Clock, ExternalLink, ListChecks, MessagesSquare, Search, UserRoundCheck } from "lucide-react";
import type { GuideOption, MemberOption, RoundOption } from "@/lib/interview/wizard-server";
import { plansFor, type FormatDef, type QuestionPlan, type WizardRound } from "@/lib/interview/wizard";
import { Avatar, inputCls } from "../../candidates/_components/ui";
import RoundsBuilder from "./RoundsBuilder";
import { CheckDot, ChoiceCard, Chip, textareaCls } from "./parts";

const PLAN_TEXT: Record<QuestionPlan, { title: string; body: string; Icon: typeof ListChecks }> = {
  set: { title: "Pick them now", body: "Choose from your library and the public bank.", Icon: ListChecks },
  later: { title: "A teammate picks later", body: "Hand this part to an engineer or hiring manager.", Icon: UserRoundCheck },
  open: { title: "No set questions", body: "The interviewer leads a free conversation.", Icon: MessagesSquare },
};

const TECH_ROLES = new Set(["OWNER", "ADMIN", "INTERVIEWER"]);

export type QuestionsValue = {
  plan: QuestionPlan;
  rounds: WizardRound[];
  guideId: string | null;
  questionsOwnerId: string | null;
  questionsNote: string;
};

export default function QuestionsPicker({
  slug,
  format,
  value,
  onChange,
  roundOptions,
  guides,
  members,
  meId,
  allowLater = true,
}: {
  slug: string;
  format: FormatDef;
  value: QuestionsValue;
  onChange: (patch: Partial<QuestionsValue>) => void;
  roundOptions: RoundOption[];
  guides: GuideOption[];
  members: MemberOption[];
  meId: string;
  allowLater?: boolean;
}) {
  const reduce = useReducedMotion();
  const plans = plansFor(format).filter((p) => allowLater || p !== "later");
  const all: QuestionPlan[] = allowLater ? ["set", "later", "open"] : ["set", "open"];

  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="How questions are decided" className={`grid grid-cols-1 gap-3 ${all.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {all.map((p) => {
          const t = PLAN_TEXT[p];
          const allowed = plans.includes(p);
          return (
            <ChoiceCard key={p} selected={value.plan === p} disabled={!allowed} onSelect={() => onChange({ plan: p })} className="p-4">
              <div className="flex items-start gap-3">
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${value.plan === p ? "bg-secondary text-bg" : "bg-panel text-muted"}`}>
                  <t.Icon className="w-4 h-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-fg">{t.title}</span>
                  <span className="block text-[13px] text-muted mt-0.5">{allowed ? t.body : "Coding rounds need a question to work on."}</span>
                </span>
                <CheckDot on={value.plan === p} />
              </div>
            </ChoiceCard>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={value.plan}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-5"
        >
          {value.plan === "set" && (
            <>
              {format.coding && (
                <div className="flex flex-col gap-2">
                  {format.guide && <SubHead title="Coding rounds" body="What the candidate works on in the shared editor." />}
                  <RoundsBuilder options={roundOptions} rounds={value.rounds} onChange={(rounds) => onChange({ rounds })} />
                </div>
              )}
              {format.guide && (
                <div className="flex flex-col gap-2">
                  <SubHead
                    title={format.coding ? "Question guide (optional)" : "Question guide"}
                    body="The interviewers see these questions in the room. The candidate never does."
                  />
                  <GuidePicker slug={slug} guides={guides} value={value.guideId} onChange={(guideId) => onChange({ guideId })} optional={format.coding} />
                </div>
              )}
            </>
          )}
          {value.plan === "later" && (
            <TeammatePicker
              members={members}
              meId={meId}
              technical={format.technical}
              ownerId={value.questionsOwnerId}
              note={value.questionsNote}
              onChange={onChange}
            />
          )}
          {value.plan === "open" && (
            <div className="rounded-xl border border-border bg-surface p-5 flex items-start gap-4">
              <span className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
                <MessagesSquare className="w-5 h-5" aria-hidden />
              </span>
              <div className="text-[13px] text-muted leading-relaxed">
                <p className="text-[14px] font-medium text-fg">Nothing more to pick</p>
                <p className="mt-1">The interviewer leads the conversation. You can leave them a private brief on the Schedule step, and they can still add a question guide later from the interview list.</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SubHead({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      <p className="text-[13px] text-muted">{body}</p>
    </div>
  );
}

function GuidePicker({
  slug,
  guides,
  value,
  onChange,
  optional,
}: {
  slug: string;
  guides: GuideOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  optional: boolean;
}) {
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = guides.filter((g) => !needle || [g.title, g.roleArea ?? "", g.brief].some((v) => v.toLowerCase().includes(needle)));
  const picked = guides.find((g) => g.id === value) ?? null;

  if (guides.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong bg-surface/60 px-6 py-8 text-center flex flex-col items-center gap-2">
        <BookOpen className="w-6 h-6 text-subtle" aria-hidden />
        <p className="text-[14px] font-medium text-fg">No questionnaires yet</p>
        <p className="text-[13px] text-muted max-w-sm">Build one in the Question library from your own questions or the public bank, then come back.</p>
        <a href={`/w/${slug}/library`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-secondary-soft hover:underline">
          Open Question library <ExternalLink className="w-3.5 h-3.5" aria-hidden />
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search questionnaires</span>
            <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questionnaires" className={`${inputCls} pl-8`} />
          </label>
          <a href={`/w/${slug}/library`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-[13px] text-muted hover:text-fg hover:bg-panel whitespace-nowrap">
            New in library <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          </a>
        </div>
        <div role="radiogroup" aria-label="Question guide" className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
          {optional && (
            <ChoiceCard selected={value === null} onSelect={() => onChange(null)} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex-1 text-[13px] text-muted">No guide, coding rounds only</span>
                <CheckDot on={value === null} size={18} />
              </div>
            </ChoiceCard>
          )}
          {shown.map((g) => (
            <ChoiceCard key={g.id} selected={value === g.id} onSelect={() => onChange(g.id)} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-medium text-fg truncate">{g.title}</span>
                  <span className="flex items-center gap-2 text-xs text-subtle mt-0.5">
                    <span>{g.questions.length} questions</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden />
                      {g.minutes} min
                    </span>
                    {g.roleArea && <span className="truncate">{g.roleArea}</span>}
                  </span>
                </span>
                <CheckDot on={value === g.id} size={18} />
              </div>
            </ChoiceCard>
          ))}
          {shown.length === 0 && <p className="text-[13px] text-muted px-1 py-4">No questionnaire matches.</p>}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4 min-h-[200px]">
        <AnimatePresence mode="wait" initial={false}>
          {picked ? (
            <motion.div key={picked.id} initial={reduce ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.18 }}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[14px] font-semibold text-fg truncate">{picked.title}</h4>
                <Chip tone="indigo">Interviewers only</Chip>
              </div>
              {picked.brief && <p className="text-[13px] text-muted mt-1">{picked.brief}</p>}
              <ol className="mt-3 flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
                {picked.questions.map((qq, i) => (
                  <motion.li
                    key={i}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 12) * 0.025 }}
                    className="flex gap-2.5 text-[13px] text-fg"
                  >
                    <span className="text-subtle tabular-nums w-5 shrink-0 text-right">{i + 1}.</span>
                    <span className="min-w-0">{qq}</span>
                  </motion.li>
                ))}
              </ol>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center gap-2 py-10">
              <BookOpen className="w-6 h-6 text-subtle" aria-hidden />
              <p className="text-[13px] text-muted max-w-[240px]">Pick a questionnaire to preview its questions here.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TeammatePicker({
  members,
  meId,
  technical,
  ownerId,
  note,
  onChange,
}: {
  members: MemberOption[];
  meId: string;
  technical: boolean;
  ownerId: string | null;
  note: string;
  onChange: (patch: Partial<QuestionsValue>) => void;
}) {
  // Engineers first when the interview is technical.
  const sorted = [...members].sort((a, b) => (technical ? Number(TECH_ROLES.has(b.role)) - Number(TECH_ROLES.has(a.role)) : 0));
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <div className="flex flex-col gap-2">
        <h3 className="text-[15px] font-semibold text-fg">Who picks the questions?</h3>
        <div role="radiogroup" aria-label="Teammate who picks the questions" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {sorted.map((m) => (
            <ChoiceCard key={m.userId} selected={ownerId === m.userId} onSelect={() => onChange({ questionsOwnerId: m.userId })} className="px-3 py-2.5">
              <div className="flex items-center gap-3">
                <Avatar name={m.name} size={32} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-fg truncate">
                    {m.name}
                    {m.userId === meId && <span className="text-subtle font-normal"> (you)</span>}
                  </span>
                  <span className="block text-xs text-subtle truncate">{roleName(m.role)}</span>
                </span>
                <CheckDot on={ownerId === m.userId} size={18} />
              </div>
            </ChoiceCard>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-fg">Note for them (optional)</span>
          <textarea
            value={note}
            onChange={(e) => onChange({ questionsNote: e.target.value })}
            rows={4}
            maxLength={500}
            placeholder="For example: Senior React role, focus on state and testing."
            className={textareaCls}
          />
        </label>
        <div className="rounded-lg bg-panel/70 border border-border p-3 text-[13px] text-muted leading-relaxed">
          They get a notification with a link. The interview shows <span className="text-warning font-medium">Questions needed</span> in the list until they pick them. You can
          still schedule and invite the candidate now.
        </div>
      </div>
    </div>
  );
}

export function roleName(role: string): string {
  return { OWNER: "Owner", ADMIN: "Admin", RECRUITER: "Recruiter", INTERVIEWER: "Interviewer", VIEWER: "Viewer" }[role] ?? role;
}


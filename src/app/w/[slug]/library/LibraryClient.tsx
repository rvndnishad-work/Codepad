"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, BookOpen, ExternalLink, ListChecks, MoreHorizontal, Plus, Trophy, Video, X } from "lucide-react";
import { TopicLogo } from "@/app/interview-questions/_components/TopicLogo";
import type { ChallengeCategory, ChallengeRow, LibraryChallenge, PublicCategory, PublicRow, Questionnaire } from "@/lib/library/library-server";
import { plural } from "@/lib/workspace/display";
import { Btn, Menu, MenuItem, MenuLabel, fmtDate, useToasts } from "../candidates/_components/ui";
import { ConfirmDialog } from "../candidates/_components/dialogs";
import PublicBrowser, { DifficultyChip, type Page } from "./PublicBrowser";
import QuestionnaireEditor from "./QuestionnaireEditor";
import { addPublicQuestionsAction, deleteQuestionnaireAction } from "./actions";
import PromptTasks, { type PromptAttemptItem, type PromptScenario } from "./PromptTasks";

export type LibraryTab = "questionnaires" | "public" | "challenges" | "prompts";

export default function LibraryClient({
  slug,
  initialTab,
  initialOpen,
  canManage,
  aiScreening,
  questionnaires,
  categories,
  rounds,
  bankTotal,
  firstPage,
  challenges,
  challengeCategories,
  challengeTotal,
  workspaceId,
  promptScenarios,
  promptAttempts,
}: {
  slug: string;
  initialTab: LibraryTab;
  initialOpen: string | null;
  canManage: boolean;
  aiScreening: boolean;
  questionnaires: Questionnaire[];
  categories: PublicCategory[];
  rounds: string[];
  bankTotal: number;
  firstPage: Page;
  challenges: LibraryChallenge[];
  challengeCategories: ChallengeCategory[];
  challengeTotal: number;
  workspaceId: string;
  promptScenarios: PromptScenario[];
  promptAttempts: PromptAttemptItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTabState] = useState<LibraryTab>(initialTab);
  const [editing, setEditing] = useState<Questionnaire | "new" | null>(() =>
    initialOpen === "new" ? "new" : questionnaires.find((q) => q.id === initialOpen) ?? null,
  );
  const [toasts, toast] = useToasts();

  const setTab = (t: LibraryTab) => {
    setTabState(t);
    setEditing(null);
    router.replace(`${pathname}${t === "questionnaires" ? "" : `?tab=${t}`}`, { scroll: false });
  };

  if (editing) {
    return (
      <>
        <QuestionnaireEditor
          key={editing === "new" ? "new" : editing.id}
          slug={slug}
          initial={editing === "new" ? null : editing}
          categories={categories}
          rounds={rounds}
          bankTotal={bankTotal}
          firstPage={firstPage}
          challengeCategories={challengeCategories}
          challengeTotal={challengeTotal}
          canManage={canManage}
          onBack={() => setEditing(null)}
          onSaved={(_id, created) => {
            toast(created ? "Questionnaire saved" : "Changes saved");
            setEditing(null);
            router.refresh();
          }}
          toast={toast}
        />
        {toasts}
      </>
    );
  }

  const tabs: { id: LibraryTab; label: string; count: number }[] = [
    { id: "questionnaires", label: "Questionnaires", count: questionnaires.length },
    { id: "public", label: "Public questions", count: bankTotal },
    { id: "challenges", label: "Coding challenges", count: challenges.length },
    { id: "prompts", label: "Prompt tasks", count: promptScenarios.length },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[260px]">
          <h1 className="text-2xl font-semibold text-fg tracking-tight">Question library</h1>
          <p className="text-sm text-muted mt-1">
            Write your own questionnaires, or build them from {bankTotal.toLocaleString("en")} public interview questions.
          </p>
        </div>
        {canManage && (tab === "questionnaires" || tab === "public") && (
          <Btn variant="primary" size="md" icon={Plus} onClick={() => setEditing("new")}>
            New questionnaire
          </Btn>
        )}
        {canManage && tab === "challenges" && (
          <Btn variant="primary" size="md" icon={Plus} href="/admin/challenges/new">
            New challenge
          </Btn>
        )}
      </header>

      <div role="tablist" aria-label="Library" className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`h-10 px-3 -mb-px border-b-2 text-sm whitespace-nowrap inline-flex items-center gap-2 ${
              tab === t.id ? "border-secondary text-fg font-medium" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {t.label}
            <span className="text-xs text-subtle tabular-nums">{t.count.toLocaleString("en")}</span>
          </button>
        ))}
      </div>

      {tab === "questionnaires" && (
        <QuestionnaireList
          slug={slug}
          items={questionnaires}
          canManage={canManage}
          aiScreening={aiScreening}
          onOpen={setEditing}
          onNew={() => setEditing("new")}
          onBrowse={() => setTab("public")}
          toast={toast}
        />
      )}
      {tab === "public" && (
        <PublicTab
          slug={slug}
          categories={categories}
          rounds={rounds}
          bankTotal={bankTotal}
          firstPage={firstPage}
          challengeCategories={challengeCategories}
          challengeTotal={challengeTotal}
          questionnaires={questionnaires}
          canManage={canManage}
          aiScreening={aiScreening}
          onDone={() => {
            setTab("questionnaires");
            router.refresh();
          }}
          toast={toast}
        />
      )}
      {tab === "challenges" && <ChallengeGrid challenges={challenges} />}
      {tab === "prompts" && <PromptTasks workspace={{ id: workspaceId, slug }} promptScenarios={promptScenarios} promptAttempts={promptAttempts} />}
      {toasts}
    </div>
  );
}

/* ── Questionnaires ─────────────────────────────────────────────────────── */

function QuestionnaireList({
  slug,
  items,
  canManage,
  aiScreening,
  onOpen,
  onNew,
  onBrowse,
  toast,
}: {
  slug: string;
  items: Questionnaire[];
  canManage: boolean;
  aiScreening: boolean;
  onOpen: (q: Questionnaire) => void;
  onNew: () => void;
  onBrowse: () => void;
  toast: (text: string, tone?: "ok" | "error") => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<Questionnaire | null>(null);
  const [busy, start] = useTransition();

  if (!items.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 flex flex-col items-center text-center gap-4">
        <span className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center justify-center text-secondary-soft">
          <ListChecks className="w-5 h-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1 max-w-md">
          <p className="text-base font-semibold text-fg">No questionnaires yet</p>
          <p className="text-sm text-muted">
            A questionnaire is a list of questions with optional reference answers. Use it in AI screening, where the AI interviewer asks the questions, or as a guide for
            your own interviews.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap justify-center gap-2">
            <Btn variant="primary" icon={Plus} onClick={onNew}>
              Write your own
            </Btn>
            <Btn icon={BookOpen} onClick={onBrowse}>
              Browse public questions
            </Btn>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((q) => {
          const techs = [...new Set(q.items.map((i) => i.tech).filter(Boolean) as string[])];
          const answered = q.items.filter((i) => i.a).length;
          return (
            <li key={q.id} className="rounded-xl border border-border bg-surface hover:border-border-strong transition-colors flex flex-col">
              <button type="button" onClick={() => onOpen(q)} className="text-left p-4 flex flex-col gap-2 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-fg flex-1 truncate">{q.title}</span>
                  {techs.slice(0, 4).map((t) => (
                    <TopicLogo key={t} slug={t} size={15} />
                  ))}
                </span>
                <span className="text-[13px] text-muted line-clamp-2">{q.brief}</span>
                <span className="text-xs text-subtle">
                  {plural(q.items.length, "question")}, {answered === q.items.length ? "all with answers" : answered ? `${answered} with answers` : "no reference answers"}
                  {q.roleArea ? `, ${q.roleArea}` : ""}, {q.minutes} min
                </span>
              </button>
              <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
                <span className="text-xs text-subtle flex-1">
                  {q.uses ? `Used in ${plural(q.uses, "screening")}` : "Not used yet"}, updated {fmtDate(q.updatedAt)}
                </span>
                {aiScreening && canManage && (
                  <Btn variant="quiet" icon={Bot} href={`/w/${slug}/ai-interviews/new?add=${q.id}`}>
                    Use in AI screening
                  </Btn>
                )}
                {canManage && (
                  <Menu
                    align="right"
                    width={180}
                    label={`Actions for ${q.title}`}
                    trigger={(p) => (
                      <button type="button" {...p} aria-label={`More actions for ${q.title}`} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-panel">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    )}
                  >
                    {(close) => (
                      <>
                        <MenuItem onClick={() => (close(), onOpen(q))}>Edit</MenuItem>
                        <MenuItem danger onClick={() => (close(), setDeleting(q))}>
                          Delete
                        </MenuItem>
                      </>
                    )}
                  </Menu>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.title}?`}
          body={
            deleting.uses
              ? `It was used in ${plural(deleting.uses, "screening")}. Those reports keep their transcripts, but new screenings can no longer use it.`
              : "This cannot be undone."
          }
          confirmLabel="Delete questionnaire"
          danger
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            start(async () => {
              const r = await deleteQuestionnaireAction(slug, deleting.id);
              if (!r.ok) return toast(r.error, "error");
              toast("Questionnaire deleted");
              setDeleting(null);
              router.refresh();
            })
          }
        />
      )}
    </>
  );
}

/* ── Public questions ───────────────────────────────────────────────────── */

function PublicTab({
  slug,
  categories,
  rounds,
  bankTotal,
  firstPage,
  challengeCategories,
  challengeTotal,
  questionnaires,
  canManage,
  aiScreening,
  onDone,
  toast,
}: {
  slug: string;
  categories: PublicCategory[];
  rounds: string[];
  bankTotal: number;
  firstPage: Page;
  challengeCategories: ChallengeCategory[];
  challengeTotal: number;
  questionnaires: Questionnaire[];
  canManage: boolean;
  aiScreening: boolean;
  onDone: () => void;
  toast: (text: string, tone?: "ok" | "error") => void;
}) {
  const [selected, setSelected] = useState<Map<string, PublicRow>>(() => new Map());
  const [adding, start] = useTransition();
  const toggle = (row: PublicRow) =>
    setSelected((m) => {
      const n = new Map(m);
      if (n.has(row.id)) n.delete(row.id);
      else if (n.size < 40) n.set(row.id, row);
      else toast("A questionnaire holds up to 40 questions.", "error");
      return n;
    });
  const picked = useMemo(() => [...selected.values()], [selected]);
  const [chSelected, setChSelected] = useState<Map<string, ChallengeRow>>(() => new Map());
  const toggleChallenge = (row: ChallengeRow) =>
    setChSelected((m) => {
      const n = new Map(m);
      if (n.has(row.id)) n.delete(row.id);
      else if (n.size < 6) n.set(row.id, row);
      else toast("Pick up to 6 challenges at a time.", "error");
      return n;
    });
  const chPicked = [...chSelected.values()];
  const chIds = chPicked.map((c) => c.id).join(",");

  function addTo(questionnaireId?: string) {
    start(async () => {
      const r = await addPublicQuestionsAction(slug, { ids: picked.map((p) => p.id), questionnaireId });
      if (!r.ok) return toast(r.error, "error");
      toast(questionnaireId ? `${plural(r.added, "question")} added` : `Questionnaire created with ${plural(r.added, "question")}`);
      setSelected(new Map());
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <PublicBrowser
        slug={slug}
        categories={categories}
        rounds={rounds}
        bankTotal={bankTotal}
        firstPage={firstPage}
        selected={selected}
        onToggle={canManage ? toggle : () => {}}
        challengeCategories={challengeCategories}
        challengeTotal={challengeTotal}
        challengeSelected={chSelected}
        onToggleChallenge={canManage ? toggleChallenge : undefined}
      />

      {chPicked.length > 0 && picked.length === 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[min(760px,calc(100vw-32px))] rounded-2xl border border-border-strong bg-elevated shadow-2xl shadow-black/40 px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-fg font-medium">{plural(chPicked.length, "challenge")} picked</span>
          <span className="flex-1" />
          <Btn variant="quiet" icon={X} onClick={() => setChSelected(new Map())}>
            Clear
          </Btn>
          <Btn variant="ghost" icon={Video} href={`/interview/new?workspaceSlug=${encodeURIComponent(slug)}&challenges=${chIds}`}>
            Use in live interview
          </Btn>
          {aiScreening && (
            <Btn variant="primary" icon={Bot} href={`/w/${slug}/ai-interviews/new?challenges=${chIds}`}>
              Use in AI screening
            </Btn>
          )}
        </div>
      )}

      {picked.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[min(760px,calc(100vw-32px))] rounded-2xl border border-border-strong bg-elevated shadow-2xl shadow-black/40 px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-fg font-medium">{plural(picked.length, "question")} picked</span>
          <span className="hidden sm:flex items-center gap-1 text-xs text-subtle">
            {[...new Set(picked.map((p) => p.technology).filter(Boolean) as string[])].slice(0, 5).map((t) => (
              <TopicLogo key={t} slug={t} size={14} />
            ))}
          </span>
          <span className="flex-1" />
          <Btn variant="quiet" icon={X} onClick={() => setSelected(new Map())}>
            Clear
          </Btn>
          <Menu
            align="right"
            width={280}
            label="Add to questionnaire"
            trigger={(p) => (
              <button type="button" {...p} disabled={adding} className="h-9 px-3.5 rounded-lg bg-secondary text-bg text-[13px] font-medium hover:brightness-110 inline-flex items-center gap-1.5 disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" strokeWidth={2.25} aria-hidden />
                {adding ? "Adding" : "Add to questionnaire"}
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem onClick={() => (close(), addTo())}>New questionnaire</MenuItem>
                {questionnaires.length > 0 && <MenuLabel>Add to an existing one</MenuLabel>}
                {questionnaires.slice(0, 8).map((q) => (
                  <MenuItem key={q.id} onClick={() => (close(), addTo(q.id))}>
                    <span className="truncate">{q.title}</span>
                  </MenuItem>
                ))}
              </>
            )}
          </Menu>
        </div>
      )}
    </div>
  );
}

/* ── Coding challenges ─────────────────────────────────────────────────── */

function ChallengeGrid({ challenges }: { challenges: LibraryChallenge[] }) {
  if (!challenges.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center flex flex-col items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
          <Trophy className="w-5 h-5" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-fg">No coding challenges yet</p>
        <p className="text-[13px] text-muted max-w-sm">Create a private challenge to send out as a take-home or use as an AI screening round.</p>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {challenges.map((c) => (
        <li key={c.id} className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-2">
          <span className="flex items-center gap-1.5">
            <DifficultyChip value={c.difficulty} />
            <span className="inline-flex items-center h-5 px-1.5 rounded border border-border text-[12px] text-muted">{c.template}</span>
            {!c.published && <span className="inline-flex items-center h-5 px-1.5 rounded border border-border text-[12px] text-subtle">Draft</span>}
          </span>
          <span className="text-sm font-semibold text-fg truncate">{c.title}</span>
          <span className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-border">
            <span className="text-xs text-subtle font-mono truncate">/{c.slug}</span>
            <Link href={`/challenges/${c.slug}`} className="inline-flex items-center gap-1 text-xs font-medium text-secondary-soft hover:underline shrink-0">
              Preview <ExternalLink className="w-3 h-3" aria-hidden />
            </Link>
          </span>
        </li>
      ))}
    </ul>
  );
}


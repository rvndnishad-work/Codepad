"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, BookOpen, Plus, Sparkles, Video, X } from "lucide-react";
import { TopicLogo } from "@/app/interview-questions/_components/TopicLogo";
import type { ChallengeCategory, ChallengeRow, PublicCategory, PublicRow, Questionnaire } from "@/lib/library/library-server";
import { MAX_QUESTIONS } from "@/lib/ai-interview/questionnaire";
import { plural } from "@/lib/workspace/display";
import { Btn, Menu, MenuItem, MenuLabel, useToasts } from "../candidates/_components/ui";
import PublicBrowser, { type Page } from "./PublicBrowser";
import QuestionnaireEditor from "./QuestionnaireEditor";
import Questionnaires from "./Questionnaires";
import { addPublicQuestionsAction } from "./actions";
import PromptTasks, { type PromptAttemptItem, type PromptScenario } from "./PromptTasks";

export type LibraryTab = "questionnaires" | "public" | "challenges" | "prompts";
export type ToastFn = (text: string, tone?: "ok" | "error", undo?: () => void) => void;

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
  challengeCategories: ChallengeCategory[];
  challengeTotal: number;
  workspaceId: string;
  promptScenarios: PromptScenario[];
  promptAttempts: PromptAttemptItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTabState] = useState<LibraryTab>(initialTab);
  const [editing, setEditingState] = useState<Questionnaire | "new" | null>(() =>
    initialOpen === "new" ? "new" : questionnaires.find((q) => q.id === initialOpen) ?? null,
  );
  const [toasts, toast] = useToasts();
  // A questionnaire made from the bank opens in the editor once the refreshed list has it.
  const [pendingOpen, setPendingOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingOpen) return;
    const q = questionnaires.find((x) => x.id === pendingOpen);
    if (q) {
      setPendingOpen(null);
      setEditingState(q);
    }
  }, [pendingOpen, questionnaires]);

  const urlFor = useCallback(
    (t: LibraryTab, open?: string | null) => {
      const p = new URLSearchParams();
      if (t !== "questionnaires") p.set("tab", t);
      if (open) p.set("open", open);
      const s = p.toString();
      return `${pathname}${s ? `?${s}` : ""}`;
    },
    [pathname],
  );

  const setTab = (t: LibraryTab) => {
    setTabState(t);
    setEditingState(null);
    router.replace(urlFor(t), { scroll: false });
  };
  // The open questionnaire lives in the URL, so a refresh or a shared link lands in the editor.
  const setEditing = (q: Questionnaire | "new" | null) => {
    setEditingState(q);
    router.replace(urlFor(q ? "questionnaires" : tab, q ? (q === "new" ? "new" : q.id) : null), { scroll: false });
    if (q) setTabState("questionnaires");
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
          canManage={canManage}
          aiScreening={aiScreening}
          onBack={() => {
            setEditing(null);
            router.refresh();
          }}
          onSaved={(id) => {
            router.replace(urlFor("questionnaires", id), { scroll: false });
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
    { id: "public", label: "Question bank", count: bankTotal },
    { id: "challenges", label: "Coding challenges", count: challengeTotal },
    { id: "prompts", label: "Prompt tasks", count: promptScenarios.length },
  ];

  return (
    <div className="flex flex-col gap-5">
      <LibraryHeader
        tab={tab}
        tabs={tabs}
        onTab={setTab}
        actions={
          canManage && (tab === "questionnaires" || tab === "public") ? (
            <>
              {tab === "questionnaires" && bankTotal > 0 && (
                <Btn size="md" icon={BookOpen} onClick={() => setTab("public")}>
                  Browse the bank
                </Btn>
              )}
              <Btn variant="primary" size="md" icon={Plus} onClick={() => setEditing("new")}>
                New questionnaire
              </Btn>
            </>
          ) : canManage && tab === "challenges" ? (
            <Btn variant="primary" size="md" icon={Plus} href="/admin/challenges/new">
              New challenge
            </Btn>
          ) : null
        }
      />

      <div key={tab} className="animate-fade-in motion-reduce:animate-none">
        {tab === "questionnaires" && (
          <Questionnaires
            slug={slug}
            items={questionnaires}
            canManage={canManage}
            aiScreening={aiScreening}
            bankTotal={bankTotal}
            onEdit={setEditing}
            onNew={() => setEditing("new")}
            onBrowse={() => setTab("public")}
            toast={toast}
          />
        )}
        {tab === "public" && (
          <BankTab
            slug={slug}
            categories={categories}
            rounds={rounds}
            bankTotal={bankTotal}
            firstPage={firstPage}
            questionnaires={questionnaires}
            canManage={canManage}
            onDone={(id, created) => {
              setTabState("questionnaires");
              router.replace(urlFor("questionnaires", created ? id : null), { scroll: false });
              if (created) setPendingOpen(id);
              router.refresh();
            }}
            toast={toast}
          />
        )}
        {tab === "challenges" && <ChallengesTab slug={slug} categories={challengeCategories} total={challengeTotal} canManage={canManage} aiScreening={aiScreening} toast={toast} />}
        {tab === "prompts" && <PromptTasks workspace={{ id: workspaceId, slug }} canManage={canManage} promptScenarios={promptScenarios} promptAttempts={promptAttempts} />}
      </div>
      {toasts}
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */

const TAB_COPY: Record<LibraryTab, string> = {
  questionnaires: "Spoken question sets for AI screening and your own interviews. Reference answers guide the grader and never reach candidates.",
  public: "Interview questions written and checked by our team. Tick the ones you want and they go into a questionnaire with their answers.",
  challenges: "Coding problems candidates solve in the playground. Pick a few and use them in a live interview or an AI screening.",
  prompts: "Tasks where candidates write a prompt for an AI model. A grader scores clarity, context and constraints.",
};

function LibraryHeader({
  tab,
  tabs,
  onTab,
  actions,
}: {
  tab: LibraryTab;
  tabs: { id: LibraryTab; label: string; count: number }[];
  onTab: (t: LibraryTab) => void;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section
        className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-6 md:px-7 animate-slide-up motion-reduce:animate-none"
        style={{
          backgroundImage:
            "radial-gradient(520px 220px at 0% 0%, rgb(var(--c-accent-2) / 0.22), transparent 70%), radial-gradient(420px 200px at 100% 130%, rgb(var(--c-accent-2) / 0.10), transparent 70%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(rgb(var(--c-border-strong) / 0.55) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage: "linear-gradient(to left, black, transparent 60%)",
            WebkitMaskImage: "linear-gradient(to left, black, transparent 60%)",
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <span
              aria-hidden
              className="hidden sm:flex w-11 h-11 shrink-0 rounded-xl items-center justify-center bg-secondary/15 text-secondary-soft ring-1 ring-inset ring-secondary/25"
            >
              <BookOpen className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold tracking-tight text-fg">Question library</h1>
              <p className="text-[15px] text-muted mt-1 max-w-[560px]">
{TAB_COPY[tab]}
              </p>
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </section>
      <div role="tablist" aria-label="Library" className="flex gap-6 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`group relative flex items-center gap-2 h-10 px-0.5 text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "text-fg" : "text-muted hover:text-fg"}`}
          >
            {t.label}
            <span
              className={`min-w-5 h-5 px-1.5 rounded-full text-xs leading-5 text-center tabular-nums transition-colors ${
                tab === t.id ? "bg-secondary/20 text-secondary-soft" : "bg-panel text-subtle group-hover:text-muted"
              }`}
            >
              {t.count.toLocaleString("en")}
            </span>
            <span
              aria-hidden
              className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-secondary origin-left transition-transform duration-300 motion-reduce:transition-none ${
                tab === t.id ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Selection tray ─────────────────────────────────────────────────────── */

export function Tray({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[min(780px,calc(100vw-32px))] rounded-2xl border border-border-strong bg-elevated/95 backdrop-blur shadow-2xl shadow-black/40 px-4 py-3 flex flex-wrap items-center gap-3 animate-slide-up motion-reduce:animate-none">
      {children}
    </div>
  );
}

function TrayCount({ n, noun, max }: { n: number; noun: string; max: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="min-w-7 h-7 px-2 rounded-full bg-secondary text-bg text-[13px] font-semibold tabular-nums inline-flex items-center justify-center animate-pop-in motion-reduce:animate-none" key={n}>
        {n}
      </span>
      <span className="text-sm text-fg font-medium">
        {noun}
        {n === 1 ? "" : "s"} picked
        <span className="hidden sm:inline text-subtle font-normal"> · up to {max}</span>
      </span>
    </span>
  );
}

/* ── Question bank ──────────────────────────────────────────────────────── */

function BankTab({
  slug,
  categories,
  rounds,
  bankTotal,
  firstPage,
  questionnaires,
  canManage,
  onDone,
  toast,
}: {
  slug: string;
  categories: PublicCategory[];
  rounds: string[];
  bankTotal: number;
  firstPage: Page;
  questionnaires: Questionnaire[];
  canManage: boolean;
  onDone: (id: string, created: boolean) => void;
  toast: ToastFn;
}) {
  const [selected, setSelected] = useState<Map<string, PublicRow>>(() => new Map());
  const [adding, start] = useTransition();
  const toggle = (row: PublicRow) =>
    setSelected((m) => {
      const n = new Map(m);
      if (n.has(row.id)) n.delete(row.id);
      else if (n.size < MAX_QUESTIONS) n.set(row.id, row);
      else toast(`A questionnaire holds up to ${MAX_QUESTIONS} questions.`, "error");
      return n;
    });
  const picked = useMemo(() => [...selected.values()], [selected]);
  const techs = [...new Set(picked.map((p) => p.technology).filter(Boolean) as string[])];

  function addTo(questionnaireId?: string, title?: string) {
    start(async () => {
      const r = await addPublicQuestionsAction(slug, { ids: picked.map((p) => p.id), questionnaireId });
      if (!r.ok) return toast(r.error, "error");
      toast(
        questionnaireId
          ? r.added
            ? `${plural(r.added, "question")} added to ${title}`
            : `${title} already has these questions`
          : `New questionnaire with ${plural(r.added, "question")}. Give it a name and check the brief.`,
      );
      setSelected(new Map());
      onDone(r.id, !questionnaireId);
    });
  }

  if (!bankTotal) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong bg-surface p-10 text-center flex flex-col items-center gap-3">
        <BookOpen className="w-6 h-6 text-subtle" aria-hidden />
        <p className="text-sm font-semibold text-fg">The question bank is empty</p>
        <p className="text-[13px] text-muted max-w-sm">Published interview questions show up here. Until then, write your own questions in a questionnaire.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <PublicBrowser mode="questions" slug={slug} categories={categories} rounds={rounds} bankTotal={bankTotal} firstPage={firstPage} selected={selected} onToggle={canManage ? toggle : undefined} />

      {picked.length > 0 && (
        <Tray>
          <TrayCount n={picked.length} noun="question" max={MAX_QUESTIONS} />
          <span className="hidden sm:flex items-center gap-1">
            {techs.slice(0, 5).map((t) => (
              <TopicLogo key={t} slug={t} size={14} />
            ))}
          </span>
          <span className="flex-1" />
          <Btn variant="quiet" icon={X} onClick={() => setSelected(new Map())}>
            Clear
          </Btn>
          <Menu
            align="right"
            width={300}
            label="Add to questionnaire"
            trigger={(p) => (
              <button
                type="button"
                {...p}
                disabled={adding}
                className="h-9 px-3.5 rounded-lg bg-secondary text-bg text-[13px] font-medium hover:brightness-110 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.25} aria-hidden />
                {adding ? "Adding" : "Add to questionnaire"}
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem onClick={() => (close(), addTo())}>
                  <Sparkles className="w-3.5 h-3.5 text-secondary-soft" /> New questionnaire
                </MenuItem>
                {questionnaires.length > 0 && <MenuLabel>Add to an existing one</MenuLabel>}
                {questionnaires.slice(0, 10).map((q) => (
                  <MenuItem key={q.id} disabled={q.items.length >= MAX_QUESTIONS} onClick={() => (close(), addTo(q.id, q.title))}>
                    <span className="flex-1 truncate">{q.title}</span>
                    <span className="text-xs text-subtle tabular-nums">{q.items.length}</span>
                  </MenuItem>
                ))}
              </>
            )}
          </Menu>
        </Tray>
      )}
    </div>
  );
}

/* ── Coding challenges ─────────────────────────────────────────────────── */

const MAX_CHALLENGES = 6;

function ChallengesTab({
  slug,
  categories,
  total,
  canManage,
  aiScreening,
  toast,
}: {
  slug: string;
  categories: ChallengeCategory[];
  total: number;
  canManage: boolean;
  aiScreening: boolean;
  toast: ToastFn;
}) {
  const [selected, setSelected] = useState<Map<string, ChallengeRow>>(() => new Map());
  const toggle = (row: ChallengeRow) =>
    setSelected((m) => {
      const n = new Map(m);
      if (n.has(row.id)) n.delete(row.id);
      else if (n.size < MAX_CHALLENGES) n.set(row.id, row);
      else toast(`Pick up to ${MAX_CHALLENGES} challenges at a time.`, "error");
      return n;
    });
  const ids = [...selected.keys()].join(",");

  if (!total) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong bg-surface p-10 text-center flex flex-col items-center gap-3">
        <p className="text-sm font-semibold text-fg">No coding challenges yet</p>
        <p className="text-[13px] text-muted max-w-sm">Create a private challenge to send as a take home or use as an AI screening round.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <PublicBrowser mode="challenges" slug={slug} challengeCategories={categories} challengeTotal={total} challengeSelected={selected} onToggleChallenge={canManage ? toggle : undefined} />
      {selected.size > 0 && (
        <Tray>
          <TrayCount n={selected.size} noun="challenge" max={MAX_CHALLENGES} />
          <span className="flex-1" />
          <Btn variant="quiet" icon={X} onClick={() => setSelected(new Map())}>
            Clear
          </Btn>
          <Btn icon={Video} href={`/w/${slug}/interviews/new?challenges=${ids}`}>
            Use in live interview
          </Btn>
          {aiScreening && (
            <Btn variant="primary" icon={Bot} href={`/w/${slug}/ai-interviews/new?challenges=${ids}`}>
              Use in AI screening
            </Btn>
          )}
        </Tray>
      )}
    </div>
  );
}

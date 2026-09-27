"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, PenLine, Plus, RefreshCw, Sparkles } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { plural } from "@/lib/workspace/display";
import { formatDuration, type QuestionStats } from "@/lib/library/question-stats";
import type { VariantCheck, VariantDraft } from "@/lib/library/variants";
import { Btn, Menu, MenuItem, MenuLabel, inputCls, useToasts } from "../../../../candidates/_components/ui";
import { addVariantToQuestionnaireAction, generateVariantAction, saveVariantAction } from "../../../actions";

export type SavedVariant = {
  id: string;
  title: string;
  prompt: string;
  href: string;
  checked: { passed: number; total: number } | null;
  createdAt: string;
};

export type DetailProps = {
  slug: string;
  kind: "bank" | "challenge" | "variant";
  id: string;
  title: string;
  /** public: on the public site. variant: a private variant. team: the workspace's own challenge. */
  visibility: "public" | "variant" | "team";
  body: string;
  bodyIsMarkdown: boolean;
  /** Reference answer, shown for saved bank variants only. */
  answer: string | null;
  publicHref: string | null;
  backHref: string;
  origin: { title: string; href: string } | null;
  canManage: boolean;
  aiReady: boolean;
  stats: QuestionStats;
  variants: SavedVariant[];
  questionnaires: { id: string; title: string; count: number; has: boolean }[];
};

const CHIP = "inline-flex items-center h-[22px] px-2 rounded-full text-[12.5px] font-medium whitespace-nowrap";

const VISIBILITY_CHIP: Record<DetailProps["visibility"], { label: string; cls: string }> = {
  public: { label: "Public question", cls: "bg-warning/10 text-warning" },
  variant: { label: "Private variant", cls: "bg-secondary/15 text-secondary-soft" },
  team: { label: "Your team", cls: "bg-panel text-muted" },
};

export default function QuestionDetail(p: DetailProps) {
  const router = useRouter();
  const [toasts, toast] = useToasts();
  const [draft, setDraft] = useState<VariantDraft | null>(null);
  const [check, setCheck] = useState<VariantCheck | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerate] = useTransition();
  const [saving, startSave] = useTransition();
  const canVary = p.visibility === "public" && p.kind !== "variant";
  const vis = VISIBILITY_CHIP[p.visibility];

  function generate() {
    setError(null);
    setEditing(false);
    startGenerate(async () => {
      const r = await generateVariantAction(p.slug, p.kind, p.id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDraft(r.draft);
      setCheck(r.check);
    });
  }

  function save() {
    if (!draft) return;
    setError(null);
    startSave(async () => {
      const r = await saveVariantAction(p.slug, p.kind, p.id, draft);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast(p.kind === "bank" ? "Variant saved. Add it to a questionnaire to use it." : "Variant saved as a private challenge for your team.");
      router.push(r.challengeId ? `/w/${p.slug}/library/q/challenge/${r.challengeId}` : `/w/${p.slug}/library/q/variant/${r.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted min-w-0">
        <Link href={p.backHref} className="hover:text-fg">
          Question library
        </Link>
        <span aria-hidden>/</span>
        <span className="text-fg font-medium truncate">{p.title}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0 max-w-[720px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">{p.title}</h1>
            <span className={`${CHIP} ${vis.cls}`}>{vis.label}</span>
          </div>
          <p className="text-sm text-muted">
            {p.visibility === "public"
              ? "This question and its answer are on the public site, so a candidate could look it up. Send a private variant instead."
              : p.visibility === "variant"
                ? "Only your workspace can see this question. Candidates cannot find it on the public site."
                : "Your team wrote this challenge. Only your workspace can see it."}
            {p.origin && (
              <>
                {" "}
                Made from{" "}
                <Link href={p.origin.href} className="text-secondary-soft hover:underline">
                  {p.origin.title}
                </Link>
                .
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.publicHref && (
            <Btn size="md" icon={ExternalLink} href={p.publicHref}>
              Public page
            </Btn>
          )}
          {canVary && p.canManage && (
            <Btn variant="primary" size="md" icon={Sparkles} onClick={generate} disabled={!p.aiReady || generating || saving}>
              {generating ? "Writing a variant" : draft ? "Make another" : "Make a private variant"}
            </Btn>
          )}
          {p.kind === "variant" && p.canManage && <AddToQuestionnaire slug={p.slug} variantId={p.id} questionnaires={p.questionnaires} toast={toast} onDone={() => router.refresh()} />}
        </div>
      </div>

      {canVary && p.canManage && !p.aiReady && (
        <p role="status" className="rounded-xl border border-border bg-panel/60 px-4 py-3 text-[13px] text-muted">
          AI is not set up on this server, so private variants cannot be made yet. An admin can add an AI key to turn this on. Usage stats below still work.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3 text-[13px] text-danger">
          {error}
        </p>
      )}

      <div className={`grid gap-5 ${canVary ? "md:grid-cols-2" : ""}`}>
        <section className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col gap-2.5 min-w-0">
          <span className="text-[13px] font-semibold text-muted">{p.visibility === "public" ? "Original, public" : "Question"}</span>
          <Body text={p.body} markdown={p.bodyIsMarkdown} />
          {p.answer && (
            <div className="mt-1 rounded-lg border border-border bg-bg/60 px-4 py-3">
              <span className="block text-xs font-medium text-subtle mb-1.5">Reference answer, never shown to candidates</span>
              <MarkdownRenderer content={p.answer} className="prose-sm text-[13.5px] leading-relaxed" />
            </div>
          )}
        </section>

        {canVary && (
          <VariantCard
            draft={draft}
            check={check}
            editing={editing}
            generating={generating}
            saving={saving}
            canManage={p.canManage}
            aiReady={p.aiReady}
            onEdit={() => setEditing((e) => !e)}
            onChange={(d) => setDraft(d)}
            onTryAnother={generate}
            onUse={save}
          />
        )}
      </div>

      <StatsCard stats={p.stats} />

      {p.variants.length > 0 && (
        <section className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col gap-3">
          <span className="text-[13px] font-semibold text-muted">Your private variants of this question</span>
          <ul className="flex flex-col divide-y divide-border">
            {p.variants.map((v) => (
              <li key={v.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex flex-col gap-0.5">
                  <Link href={v.href} className="text-sm font-medium text-fg hover:text-secondary-soft">
                    {v.title}
                  </Link>
                  <span className="text-[13px] text-muted line-clamp-1">{v.prompt}</span>
                </div>
                <span className={`${CHIP} shrink-0 ${v.checked ? "bg-success/10 text-success" : "bg-panel text-muted"}`}>
                  {v.checked ? `${v.checked.passed} of ${v.checked.total} tests passed` : "No tests"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {toasts}
    </div>
  );
}

function Body({ text, markdown }: { text: string; markdown: boolean }) {
  if (markdown) {
    return (
      <div className="max-h-[420px] overflow-y-auto">
        <MarkdownRenderer content={text} className="prose-sm text-sm leading-relaxed" />
      </div>
    );
  }
  return <p className="text-sm text-fg leading-relaxed whitespace-pre-line">{text}</p>;
}

function CheckChip({ check }: { check: VariantCheck }) {
  if (check.status === "passed") return <span className={`${CHIP} bg-success/10 text-success`}>Answer checked</span>;
  if (check.status === "failed") return <span className={`${CHIP} bg-danger/10 text-danger`}>Tests failed</span>;
  return <span className={`${CHIP} bg-panel text-muted`}>No tests to run</span>;
}

function checkCopy(check: VariantCheck, kind: VariantDraft["kind"]): string {
  if (check.status === "passed") {
    return `Same skill, new setting and inputs. The reference answer was regenerated and passed all ${plural(check.total, "test")}. The tests run again when you save it.`;
  }
  if (check.status === "failed") {
    return `The regenerated reference answer passed ${check.passed} of ${plural(check.total, "test")}, so this variant cannot be saved. Try another. ${check.detail}`;
  }
  return kind === "bank"
    ? "Same skill, new setting. The reference answer was rewritten for the new question. There are no tests for spoken questions, so read it before you use it."
    : "Same skill, new setting. This challenge is reviewed by hand and has no tests, so read the new brief before you use it.";
}

function VariantCard({
  draft,
  check,
  editing,
  generating,
  saving,
  canManage,
  aiReady,
  onEdit,
  onChange,
  onTryAnother,
  onUse,
}: {
  draft: VariantDraft | null;
  check: VariantCheck | null;
  editing: boolean;
  generating: boolean;
  saving: boolean;
  canManage: boolean;
  aiReady: boolean;
  onEdit: () => void;
  onChange: (d: VariantDraft) => void;
  onTryAnother: () => void;
  onUse: () => void;
}) {
  if (generating || !draft || !check) {
    return (
      <section className="rounded-xl border border-dashed border-border-strong bg-surface px-5 py-4 flex flex-col gap-2.5 min-w-0" aria-live="polite">
        <span className="text-[13px] font-semibold text-muted">Private variant, only your workspace</span>
        {generating ? (
          <>
            <span className="h-3.5 w-11/12 rounded bg-panel animate-pulse motion-reduce:animate-none" />
            <span className="h-3.5 w-4/5 rounded bg-panel animate-pulse motion-reduce:animate-none" />
            <span className="h-3.5 w-2/3 rounded bg-panel animate-pulse motion-reduce:animate-none" />
            <span className="text-[13px] text-muted">Writing a variant, then running its tests. This can take up to a minute.</span>
          </>
        ) : (
          <p className="text-[13px] text-muted leading-relaxed">
            {!canManage
              ? "Only people who run interviews can make variants."
              : !aiReady
                ? "Variants need AI, which is not set up on this server."
                : "A variant keeps the skill and the difficulty but changes the setting and the inputs. Where the question has tests, the new reference answer has to pass them before you can save it."}
          </p>
        )}
      </section>
    );
  }

  const failed = check.status === "failed";
  return (
    <section className="rounded-xl border border-secondary bg-surface px-5 py-4 flex flex-col gap-2.5 min-w-0" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-muted">Private variant, only your workspace</span>
        <CheckChip check={check} />
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-subtle">
            Name
            <input value={draft.title} maxLength={120} onChange={(e) => onChange({ ...draft, title: e.target.value })} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-subtle">
            {draft.kind === "bank" ? "Question" : "Brief"}
            <textarea
              value={draft.prompt}
              maxLength={draft.kind === "bank" ? 600 : 8000}
              rows={draft.kind === "bank" ? 4 : 10}
              onChange={(e) => onChange({ ...draft, prompt: e.target.value })}
              className={`${inputCls} h-auto py-2 leading-relaxed`}
            />
          </label>
          {draft.kind === "bank" && (
            <label className="flex flex-col gap-1 text-xs text-subtle">
              Reference answer
              <textarea value={draft.answer} maxLength={4000} rows={6} onChange={(e) => onChange({ ...draft, answer: e.target.value })} className={`${inputCls} h-auto py-2 leading-relaxed`} />
            </label>
          )}
        </div>
      ) : (
        <>
          <span className="text-sm font-medium text-fg">{draft.title}</span>
          <Body text={draft.prompt} markdown={draft.kind === "challenge"} />
          {draft.kind === "bank" && (
            <details className="rounded-lg border border-border bg-bg/60 px-4 py-2.5">
              <summary className="text-xs font-medium text-subtle cursor-pointer">Reference answer</summary>
              <MarkdownRenderer content={draft.answer} className="prose-sm text-[13.5px] leading-relaxed mt-2" />
            </details>
          )}
        </>
      )}
      <span className={`text-[13px] ${failed ? "text-danger" : "text-muted"}`}>{checkCopy(check, draft.kind)}</span>
      <div className="flex flex-wrap gap-2">
        <Btn icon={RefreshCw} onClick={onTryAnother} disabled={saving}>
          Try another
        </Btn>
        <Btn icon={PenLine} onClick={onEdit} disabled={saving || failed}>
          {editing ? "Done editing" : "Edit"}
        </Btn>
        <Btn variant="primary" onClick={onUse} disabled={saving || failed || !draft.title.trim() || !draft.prompt.trim()}>
          {saving ? (check.status === "passed" ? "Running tests and saving" : "Saving") : "Use this variant"}
        </Btn>
      </div>
    </section>
  );
}

function StatsCard({ stats }: { stats: QuestionStats }) {
  const items = [
    { value: stats.timesAsked.toLocaleString("en"), label: "times asked" },
    { value: stats.averageScore == null ? "No data" : `${stats.averageScore}%`, label: "average score" },
    { value: stats.separation == null ? "Not enough data" : stats.separation.toFixed(2), label: "separation between passed and not passed" },
    { value: formatDuration(stats.averageSeconds), label: "average time on it" },
  ];
  return (
    <section className="rounded-xl border border-border bg-surface px-5 py-4 flex flex-col gap-3">
      <span className="text-[13px] font-semibold text-muted">How this question performs in your workspace</span>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5 min-w-0">
            <dt className="order-2 text-[13px] text-muted">{s.label}</dt>
            <dd className={`order-1 font-semibold tabular-nums text-fg ${s.value.length > 8 ? "text-base" : "text-[22px]"}`}>{s.value}</dd>
          </div>
        ))}
      </dl>
      <span className="text-[13px] text-muted">
        {stats.timesAsked === 0
          ? "No candidate in this workspace has had this question yet. Stats show up once results come in."
          : stats.separation == null
            ? `Separation shows once candidates you passed and candidates you did not pass have both answered it (${stats.passedCount} passed, ${stats.notPassedCount} not passed so far).`
            : `A higher separation means strong and weak candidates score clearly differently on this question. Based on ${stats.passedCount} passed and ${stats.notPassedCount} not passed.`}
      </span>
    </section>
  );
}

function AddToQuestionnaire({
  slug,
  variantId,
  questionnaires,
  toast,
  onDone,
}: {
  slug: string;
  variantId: string;
  questionnaires: DetailProps["questionnaires"];
  toast: (text: string, tone?: "ok" | "error") => void;
  onDone: () => void;
}) {
  const [busy, start] = useTransition();
  function add(id?: string, title?: string) {
    start(async () => {
      const r = await addVariantToQuestionnaireAction(slug, variantId, id);
      if (!r.ok) return toast(r.error, "error");
      toast(id ? (r.added ? `Added to ${title}` : `${title} already has this question`) : "New questionnaire made with this question");
      onDone();
    });
  }
  return (
    <Menu
      align="right"
      width={300}
      label="Add to questionnaire"
      trigger={(t) => (
        <button
          type="button"
          {...t}
          disabled={busy}
          className="h-9 px-3.5 rounded-lg bg-secondary text-bg text-[13px] font-medium hover:brightness-110 inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.25} aria-hidden />
          {busy ? "Adding" : "Add to questionnaire"}
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem onClick={() => (close(), add())}>
            <Sparkles className="w-3.5 h-3.5 text-secondary-soft" /> New questionnaire
          </MenuItem>
          {questionnaires.length > 0 && <MenuLabel>Add to an existing one</MenuLabel>}
          {questionnaires.slice(0, 12).map((q) => (
            <MenuItem key={q.id} disabled={q.has || q.count >= 40} onClick={() => (close(), add(q.id, q.title))}>
              <span className="flex-1 truncate">{q.title}</span>
              <span className="text-xs text-subtle tabular-nums">{q.has ? "Added" : q.count}</span>
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}

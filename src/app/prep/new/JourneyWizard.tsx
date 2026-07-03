"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarDays,
  Clock,
  Loader2,
  Map,
  Sparkles,
} from "lucide-react";
import TechSvg from "@/components/TechSvg";
import { techLabel } from "@/lib/interview-questions/shared";
import {
  JOURNEY_ROLES,
  JOURNEY_DURATIONS,
  DAILY_BUDGETS,
  rolePreset,
  type JourneyRole,
} from "@/lib/prep-journey/shared";

const STEPS = ["Goal", "Tech stack", "Pace"] as const;

export default function JourneyWizard({
  techCounts,
  activeJourneyTitle,
}: {
  techCounts: Record<string, number>;
  activeJourneyTitle: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<JourneyRole>("frontend");
  const [stack, setStack] = useState<string[]>(rolePreset("frontend").defaultStack);
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [durationDays, setDurationDays] = useState(30);
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [needsReplace, setNeedsReplace] = useState(Boolean(activeJourneyTitle));

  const preset = rolePreset(role);

  function pickRole(slug: JourneyRole) {
    setRole(slug);
    setStack(rolePreset(slug).defaultStack);
  }

  function toggleTech(slug: string) {
    setStack((s) => (s.includes(slug) ? s.filter((t) => t !== slug) : [...s, slug]));
  }

  const estQuestionCount = useMemo(
    () => stack.reduce((sum, t) => sum + (techCounts[t] ?? 0), 0),
    [stack, techCounts],
  );

  async function submit(replace: boolean) {
    setSubmitting(true);
    setError("");
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const res = await fetch("/api/prep-journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          techStack: stack,
          dailyMinutes,
          durationDays: targetDate ? undefined : durationDays,
          targetDate: targetDate ? new Date(`${targetDate}T12:00:00`).toISOString() : null,
          timezone,
          replace,
        }),
      });
      if (res.status === 409) {
        setNeedsReplace(true);
        setError("You already have an active journey — replacing it archives the old plan.");
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.error === "string" ? data.error : "Something went wrong — try again.");
        setSubmitting(false);
        return;
      }
      router.push("/prep");
      router.refresh();
    } catch {
      setError("Network error — try again.");
      setSubmitting(false);
    }
  }

  const canContinue = step === 0 ? true : step === 1 ? stack.length > 0 : !submitting;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <Link
        href="/dashboard"
        className="group inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-fg transition-colors duration-200 mb-6"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1.5 transition-transform duration-200" />
        Back to dashboard
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface border border-border text-muted mb-3">
          <Map className="w-3.5 h-3.5 text-accent" />
          Prep Journey
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Build your interview prep plan</h1>
        <p className="text-sm text-muted mt-2 max-w-xl leading-relaxed">
          Pick a goal, choose your stack, set a daily pace — we generate a day-by-day plan from the
          question bank and challenge catalog, and track everything you solve.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                i === step
                  ? "bg-accent text-bg border-accent"
                  : i < step
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border text-muted"
              }`}
            >
              {i < step ? <Check className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
              {label}
            </button>
            {i < STEPS.length - 1 && <span className="w-6 h-px bg-border" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Goal ── */}
        {step === 0 && (
          <motion.div
            key="goal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {JOURNEY_ROLES.map((r) => (
              <button
                key={r.slug}
                onClick={() => pickRole(r.slug)}
                className={`text-left p-5 rounded-2xl border transition-all duration-200 ${
                  role === r.slug
                    ? "border-accent/60 bg-accent/[0.07] shadow-[0_4px_20px_var(--accent-glow)]"
                    : "border-border bg-surface/60 hover:border-accent/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-black tracking-tight">{r.label}</span>
                  <span
                    className={`w-4 h-4 rounded-full border grid place-items-center ${
                      role === r.slug ? "border-accent bg-accent" : "border-border"
                    }`}
                  >
                    {role === r.slug && <Check className="w-3 h-3 text-bg" />}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1.5 leading-relaxed">{r.tagline}</p>
              </button>
            ))}
          </motion.div>
        )}

        {/* ── Step 2: Tech stack ── */}
        {step === 1 && (
          <motion.div
            key="stack"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {preset.stackOptions.map((slug) => {
                const active = stack.includes(slug);
                const count = techCounts[slug] ?? 0;
                return (
                  <button
                    key={slug}
                    onClick={() => toggleTech(slug)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 ${
                      active
                        ? "border-accent/60 bg-accent/[0.07]"
                        : "border-border bg-surface/60 hover:border-accent/30"
                    }`}
                  >
                    <TechSvg tech={slug} className="w-6 h-6 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{techLabel(slug)}</div>
                      <div className="text-[10px] text-muted font-semibold">{count} questions</div>
                    </div>
                    {active && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted mt-4 font-semibold">
              {stack.length} selected · ~{estQuestionCount} questions in the pool
            </p>
          </motion.div>
        )}

        {/* ── Step 3: Pace ── */}
        {step === 2 && (
          <motion.div
            key="pace"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5 mb-3">
                <Clock className="w-3.5 h-3.5 text-accent" /> Daily time budget
              </h3>
              <div className="flex flex-wrap gap-2">
                {DAILY_BUDGETS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setDailyMinutes(m)}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
                      dailyMinutes === m
                        ? "bg-accent text-bg border-accent"
                        : "border-border bg-surface/60 text-muted hover:text-fg hover:border-accent/40"
                    }`}
                  >
                    {m} min/day
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5 mb-3">
                <CalendarDays className="w-3.5 h-3.5 text-accent" /> Plan length
              </h3>
              <div className="flex flex-wrap gap-2">
                {JOURNEY_DURATIONS.map((d) => (
                  <button
                    key={d.days}
                    onClick={() => {
                      setDurationDays(d.days);
                      setTargetDate("");
                    }}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
                      !targetDate && durationDays === d.days
                        ? "bg-accent text-bg border-accent"
                        : "border-border bg-surface/60 text-muted hover:text-fg hover:border-accent/40"
                    }`}
                  >
                    {d.label}
                    <span className="block text-[10px] font-semibold opacity-70">{d.tagline}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label className="text-xs font-bold text-muted shrink-0" htmlFor="target-date">
                  …or fit it to my interview date:
                </label>
                <input
                  id="target-date"
                  type="date"
                  value={targetDate}
                  min={new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-border bg-surface text-sm font-semibold text-fg focus:outline-none focus:border-accent/60"
                />
              </div>
            </div>

            {needsReplace && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-xs font-semibold text-muted">
                You already have an active journey{activeJourneyTitle ? ` (“${activeJourneyTitle}”)` : ""}.
                Creating this one will <span className="text-amber-600 dark:text-amber-400">archive it</span> —
                solved progress stays on your account.
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-4 text-xs font-semibold text-rose-500">
                {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer nav */}
      <div className="flex items-center justify-between mt-10">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-bold text-muted hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {step < 2 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canContinue}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-bg text-sm font-black hover:bg-accent-soft disabled:opacity-50 transition shadow-lg"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => submit(needsReplace)}
            disabled={submitting || stack.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-bg text-sm font-black hover:bg-accent-soft disabled:opacity-60 transition shadow-lg"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {submitting ? "Generating plan…" : "Generate my journey"}
          </button>
        )}
      </div>
    </div>
  );
}

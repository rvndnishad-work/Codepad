"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { DEMO_STAGES, STAGE_LABELS, type DemoStage } from "@/lib/demo-requests/model";
import { buttonCls, inputCls } from "../../interviews/_components/list";
import {
  changeStageAction,
  createPilotAction,
  endPilotAction,
  extendPilotAction,
  saveNotesAction,
  setDemoTimeAction,
  takeRequestAction,
  type ActionResult,
} from "./actions";

const primaryCls =
  "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-fg px-3 text-sm font-medium text-bg transition hover:opacity-90 disabled:opacity-50";
const dangerCls =
  "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-danger/40 px-3 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50";
const DAY_MS = 86_400_000;

function useAction() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const go = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setResult(null);
      setResult(await fn());
    });
  return { pending, result, go };
}

function Feedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return result.ok ? (
    <p role="status" className="text-sm text-success">
      {result.message ?? "Saved."}
    </p>
  ) : (
    <p role="alert" className="text-sm text-danger">
      {result.error}
    </p>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function LengthPicker({ lengths, value, onChange, legend }: { lengths: number[]; value: number; onChange: (d: number) => void; legend: string }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-xs text-muted">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {lengths.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={d === value}
            onClick={() => onChange(d)}
            className={`h-9 rounded-lg border px-3 text-sm transition ${d === value ? "border-border-strong bg-panel font-medium text-fg" : "border-border text-muted hover:bg-panel"}`}
          >
            {d} days
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function RequestControls({
  id,
  stage,
  ownedByMe,
  owner,
  demoAt,
  notes,
}: {
  id: string;
  stage: DemoStage;
  ownedByMe: boolean;
  owner: string | null;
  demoAt: string;
  notes: string;
}) {
  const { pending, result, go } = useAction();
  const [stageValue, setStageValue] = useState<string>(stage);
  const [when, setWhen] = useState(demoAt);
  const [text, setText] = useState(notes);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Stage" htmlFor="demo-stage">
          <select id="demo-stage" value={stageValue} onChange={(e) => setStageValue(e.target.value)} className={inputCls}>
            {DEMO_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <button type="button" className={buttonCls} disabled={pending || stageValue === stage} onClick={() => go(() => changeStageAction(id, stageValue))}>
          Save stage
        </button>
        <span className="flex-1" />
        <button type="button" className={buttonCls} disabled={pending} onClick={() => go(() => takeRequestAction(id, !ownedByMe))}>
          {ownedByMe ? "Let it go" : owner ? "Take over" : "Take this request"}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Demo time (UTC)" htmlFor="demo-at">
          <input id="demo-at" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
        </Field>
        <button type="button" className={buttonCls} disabled={pending || when === demoAt} onClick={() => go(() => setDemoTimeAction(id, when))}>
          {when ? "Book demo" : "Clear demo time"}
        </button>
      </div>

      <Field label="Internal notes (only admins see these)" htmlFor="demo-notes">
        <textarea id="demo-notes" rows={4} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} className={`${inputCls} h-auto py-2`} />
      </Field>
      <div className="flex items-center gap-3">
        <button type="button" className={buttonCls} disabled={pending || text === notes} onClick={() => go(() => saveNotesAction(id, text))}>
          Save notes
        </button>
        {pending ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
        <Feedback result={result} />
      </div>
    </div>
  );
}

export function CreatePilotForm({
  id,
  contactName,
  defaults,
  lengths,
  maxSeats,
  maxCredits,
  nowIso,
}: {
  id: string;
  contactName: string;
  defaults: { workspaceName: string; slug: string; ownerEmail: string; days: number; seats: number; credits: number };
  lengths: number[];
  maxSeats: number;
  maxCredits: number;
  nowIso: string;
}) {
  const { pending, result, go } = useAction();
  const [name, setName] = useState(defaults.workspaceName);
  const [slug, setSlug] = useState(defaults.slug);
  const [email, setEmail] = useState(defaults.ownerEmail);
  const [days, setDays] = useState(defaults.days);
  const [seats, setSeats] = useState(String(defaults.seats));
  const [credits, setCredits] = useState(String(defaults.credits));
  const [note, setNote] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const ends = new Date(new Date(nowIso).getTime() + days * DAY_MS).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  if (result?.ok && result.slug) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
        <p className="font-medium text-fg">{result.message}</p>
        <p className="text-muted">
          Workspace address: <Link className="underline" href={`/w/${result.slug}`}>/w/{result.slug}</Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        go(() => createPilotAction(id, { workspaceName: name, slug, ownerEmail: email, days, seats, credits, note, sendEmail }));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Workspace name" htmlFor="pilot-name">
          <input id="pilot-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
        </Field>
        <Field label="Address (/w/...)" htmlFor="pilot-slug">
          <input id="pilot-slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} className={inputCls} pattern="[a-z0-9-]{2,100}" required />
        </Field>
        <Field label="Owner email" htmlFor="pilot-email">
          <input id="pilot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required />
        </Field>
        <Field label="Reason (for the audit log)" htmlFor="pilot-note">
          <input id="pilot-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Demo on 22 Oct, wants Greenhouse" className={inputCls} required />
        </Field>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <LengthPicker legend="Length" lengths={lengths} value={days} onChange={setDays} />
        <Field label={`Seats (1 to ${maxSeats})`} htmlFor="pilot-seats">
          <input id="pilot-seats" type="number" min={1} max={maxSeats} value={seats} onChange={(e) => setSeats(e.target.value)} className={`${inputCls} w-28`} />
        </Field>
        <Field label={`Pilot credits (0 to ${maxCredits})`} htmlFor="pilot-credits">
          <input id="pilot-credits" type="number" min={0} max={maxCredits} value={credits} onChange={(e) => setCredits(e.target.value)} className={`${inputCls} w-28`} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-fg">
        <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
        Email {contactName} a welcome with the sign-in link
      </label>
      <div className="rounded-lg bg-panel p-3 text-sm leading-relaxed text-muted">
        <strong className="text-fg">What happens</strong>
        <ol className="mt-1 list-decimal pl-5">
          <li>
            Workspace {name || "(no name)"} is created with Growth features and {seats || "?"} seats until {ends}.
          </li>
          <li>{credits || 0} pilot credits are added. Whatever is left expires when the pilot ends.</li>
          <li>{email || "The contact"} becomes the owner. Without an account yet, they get an owner invite and signing up creates one.</li>
          <li>The request moves to Pilot and links to the workspace.</li>
        </ol>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryCls} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create pilot
        </button>
        <Feedback result={result} />
      </div>
    </form>
  );
}

export function PilotControls({ id, active, lengths }: { id: string; active: boolean; lengths: number[] }) {
  const { pending, result, go } = useAction();
  const [days, setDays] = useState(lengths[0] ?? 7);
  const [credits, setCredits] = useState("0");
  const [note, setNote] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-4">
        <LengthPicker legend={active ? "Add days" : "Restart for"} lengths={lengths} value={days} onChange={setDays} />
        <Field label="Extra credits" htmlFor="extend-credits">
          <input id="extend-credits" type="number" min={0} value={credits} onChange={(e) => setCredits(e.target.value)} className={`${inputCls} w-28`} />
        </Field>
      </div>
      <Field label="Reason (for the audit log)" htmlFor="extend-note">
        <input id="extend-note" value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Asked for another week to finish the role" />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryCls} disabled={pending} onClick={() => go(() => extendPilotAction(id, days, Number(credits) || 0, note))}>
          {active ? "Extend pilot" : "Restart pilot"}
        </button>
        {active ? (
          confirmEnd ? (
            <>
              <button
                type="button"
                className={dangerCls}
                disabled={pending}
                onClick={() => {
                  setConfirmEnd(false);
                  go(() => endPilotAction(id, note));
                }}
              >
                Yes, end it now
              </button>
              <button type="button" className={buttonCls} onClick={() => setConfirmEnd(false)}>
                Keep it running
              </button>
            </>
          ) : (
            <button type="button" className={dangerCls} disabled={pending} onClick={() => setConfirmEnd(true)}>
              End pilot now
            </button>
          )
        ) : null}
        {pending ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
      </div>
      {confirmEnd ? <p className="text-sm text-warning">The workspace moves to Free straight away and unused pilot credits expire. Add a reason above first.</p> : null}
      <Feedback result={result} />
    </div>
  );
}

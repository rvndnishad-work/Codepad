"use client";

/**
 * Settings > Candidate experience. Four cards:
 *   Brand: logo (set in General) and brand colour, with a live sample.
 *   Emails to candidates: sender name and a confirmed reply-to address.
 *   Email wording: subject and opening text per email, with preview and test.
 *   Privacy and consent: privacy notice, consent box, help contact.
 *
 * Brand colour, sender name, privacy notice, consent and help contact save
 * together through the sticky save bar. Reply-to and wording save on their
 * own, because each has its own confirmation step.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, Mail, Pencil, RotateCcw, Send } from "lucide-react";
import { Btn, Dialog, useToasts } from "../../candidates/_components/ui";
import { SaveBar, SettingRow, SettingsCard, TextInput, Toggle, inputCls, useSettingsForm } from "../_components/form";
import {
  BODY_MAX,
  CANDIDATE_EMAILS,
  PLACEHOLDERS,
  SUBJECT_MAX,
  brandColorWarning,
  readableTextOn,
  type CandidateEmailKey,
  type ReplyToStatus,
} from "@/lib/workspace/candidate-experience";
import { senderDisplayName } from "@/lib/workspace/settings";
import {
  previewEmailAction,
  removeReplyToAction,
  requestReplyToAction,
  resetEmailWordingAction,
  saveEmailWordingAction,
  sendTestEmailAction,
  type PreviewDraft,
} from "./actions";

export type SavedWording = { subject: string | null; body: string | null; updatedAt: string };

type FormValues = {
  brandColor: string;
  senderName: string;
  privacyNoticeUrl: string;
  consentRequired: boolean;
  helpEmail: string;
};

type Props = {
  slug: string;
  canEdit: boolean;
  growth: boolean;
  workspaceName: string;
  logoUrl: string | null;
  initial: FormValues;
  replyTo: { email: string | null; status: ReplyToStatus; confirmedAt: string | null };
  wording: Partial<Record<CandidateEmailKey, SavedWording>>;
  emailKeys: CandidateEmailKey[];
};

const HEX_RE = /^#[0-9a-f]{6}$/i;
const GROWTH_NOTE = "Available on the Growth plan and during a trial.";

/** "#abc" and "#aabbcc" become "#aabbcc"; anything else is null. */
function normalHex(v: string): string | null {
  const s = v.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  return HEX_RE.test(s) ? s : null;
}

export default function CandidateExperienceClient({ slug, canEdit, growth, workspaceName, logoUrl, initial, replyTo, wording, emailKeys }: Props) {
  const form = useSettingsForm<FormValues>({ slug, group: "candidate-experience", initial, canEdit });
  const { values, set, errors, disabled } = form;
  const [editing, setEditing] = useState<CandidateEmailKey | null>(null);
  const [saved, setSaved] = useState(wording);
  const [toastNode, toast] = useToasts();

  const color = normalHex(values.brandColor);
  const warning = brandColorWarning(color);
  const senderPreview = senderDisplayName({ senderName: values.senderName.trim() || null, name: workspaceName });

  const draftBrand = useMemo<PreviewDraft>(
    () => ({ brandColor: values.brandColor, senderName: values.senderName, helpEmail: values.helpEmail, privacyNoticeUrl: values.privacyNoticeUrl }),
    [values.brandColor, values.senderName, values.helpEmail, values.privacyNoticeUrl],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Brand */}
      <SettingsCard
        title="Brand"
        description="Your logo and colour on take-home, AI screening and interview pages, and in every email candidates get. Available on every plan."
      >
        <SettingRow
          label="Logo"
          help={
            <>
              The same logo as the rest of the workspace. Change it in{" "}
              <Link href={`/w/${slug}/settings/general`} className="text-secondary-soft hover:underline">
                General
              </Link>
              .
            </>
          }
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`${workspaceName} logo`} className="h-10 max-w-[200px] w-auto rounded-md border border-border bg-bg object-contain p-1" />
          ) : (
            <p className="text-[13px] text-muted">No logo yet. Candidates see your workspace name instead.</p>
          )}
        </SettingRow>

        <SettingRow
          label="Brand colour"
          htmlFor="ce-brand-color"
          help="Used for the main button on candidate pages and in emails. Button text switches between dark and light to stay readable."
          error={errors.brandColor}
        >
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative inline-flex h-9 w-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-bg focus-within:ring-2 focus-within:ring-secondary/40">
              <span className="sr-only">Pick a colour</span>
              <span aria-hidden className={`absolute inset-1 rounded-md ${color ? "" : "bg-secondary"}`} style={color ? { background: color } : undefined} />
              <input
                type="color"
                value={color ?? "#6366f1"}
                disabled={disabled}
                onChange={(e) => set("brandColor", e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
            </label>
            <TextInput
              id="ce-brand-color"
              value={values.brandColor}
              placeholder="Default"
              maxLength={7}
              spellCheck={false}
              disabled={disabled}
              onChange={(e) => set("brandColor", e.target.value)}
              className="!w-32 font-mono"
              aria-invalid={!!errors.brandColor}
            />
            {values.brandColor && (
              <Btn variant="quiet" onClick={() => set("brandColor", "")} disabled={disabled}>
                Use default
              </Btn>
            )}
          </div>
          {warning && <p className="text-[13px] text-warning">{warning}</p>}
        </SettingRow>

        <SettingRow label="How it looks" help="A sample of the top of a candidate page.">
          <BrandSample name={workspaceName} logoUrl={logoUrl} color={color} />
        </SettingRow>
      </SettingsCard>

      {/* Sender and reply-to */}
      <SettingsCard title="Emails to candidates" description="Who candidate emails come from, and where candidates' replies go.">
        <SettingRow
          label="Sender name"
          htmlFor="ce-sender"
          badge={growth ? undefined : "Growth"}
          help={growth ? `Candidates see: ${senderPreview}` : `${GROWTH_NOTE} Until then, emails come from Interviewpad.`}
          error={errors.senderName}
        >
          <TextInput
            id="ce-sender"
            value={values.senderName}
            placeholder={workspaceName}
            maxLength={60}
            disabled={disabled || !growth}
            onChange={(e) => set("senderName", e.target.value)}
            aria-invalid={!!errors.senderName}
          />
        </SettingRow>
        <ReplyToRow slug={slug} canEdit={canEdit} growth={growth} initial={replyTo} toast={toast} />
      </SettingsCard>

      {/* Wording */}
      <SettingsCard
        title="Email wording"
        description="Change the subject and opening text of each email. The button, link, deadline, help and unsubscribe lines are always added, so an edit cannot break an invite."
        aside={growth ? undefined : <span className="rounded-full bg-panel border border-border text-xs font-medium text-muted px-2 leading-5">Growth</span>}
      >
        {emailKeys.map((key) => {
          const def = CANDIDATE_EMAILS[key];
          const edited = !!saved[key];
          return (
            <div key={key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-fg">
                  {def.label}
                  {edited && <span className="rounded-full bg-secondary/15 text-secondary-soft text-xs font-medium px-2 leading-5">Edited</span>}
                </div>
                <p className="text-[13px] text-muted">{def.when}</p>
              </div>
              <Btn icon={growth && canEdit ? Pencil : Eye} onClick={() => setEditing(key)}>
                {growth && canEdit ? "Edit" : "Preview"}
              </Btn>
            </div>
          );
        })}
        {!growth && <p className="px-5 py-3.5 text-[13px] text-muted">{GROWTH_NOTE} You can still preview how each email looks with your brand.</p>}
      </SettingsCard>

      {/* Privacy and consent */}
      <SettingsCard title="Privacy and consent" description="What candidates see before they start, and who they can ask for help.">
        <SettingRow
          label="Privacy notice"
          htmlFor="ce-privacy"
          help="A link to your privacy notice. Shown on candidate pages, next to the consent box and at the bottom of emails."
          error={errors.privacyNoticeUrl}
        >
          <TextInput
            id="ce-privacy"
            type="url"
            inputMode="url"
            value={values.privacyNoticeUrl}
            placeholder="https://company.com/privacy"
            disabled={disabled}
            onChange={(e) => set("privacyNoticeUrl", e.target.value)}
            aria-invalid={!!errors.privacyNoticeUrl}
          />
        </SettingRow>
        <SettingRow
          label="Ask for consent"
          help="Candidates tick a box before an AI screening or a live interview starts. We keep the time they agreed. Screenings already started are not affected."
          error={errors.consentRequired}
        >
          <div className="flex items-center gap-3">
            <Toggle checked={values.consentRequired} onChange={(v) => set("consentRequired", v)} label="Ask for consent" disabled={disabled} />
            <span className="text-[13px] text-muted">{values.consentRequired ? "On" : "Off"}</span>
          </div>
          {values.consentRequired && !values.privacyNoticeUrl.trim() && (
            <p className="text-[13px] text-muted">Tip: add a privacy notice so candidates can read what they agree to.</p>
          )}
        </SettingRow>
        <SettingRow
          label="Help contact"
          htmlFor="ce-help"
          help="An email address for candidates who get stuck. Shown on candidate pages and at the bottom of emails."
          error={errors.helpEmail}
        >
          <TextInput
            id="ce-help"
            type="email"
            value={values.helpEmail}
            placeholder="recruiting@company.com"
            disabled={disabled}
            onChange={(e) => set("helpEmail", e.target.value)}
            aria-invalid={!!errors.helpEmail}
          />
        </SettingRow>
      </SettingsCard>

      {editing && (
        <WordingDialog
          key={editing}
          slug={slug}
          emailKey={editing}
          editable={growth && canEdit}
          canTest={canEdit}
          growth={growth}
          saved={saved[editing] ?? null}
          brandDraft={draftBrand}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            setSaved((s) => {
              const copy = { ...s };
              if (next) copy[editing] = next;
              else delete copy[editing];
              return copy;
            });
          }}
          toast={toast}
        />
      )}

      {toastNode}
      <SaveBar form={form} />
    </div>
  );
}

/* ── Brand sample ───────────────────────────────────────────────────────── */

function BrandSample({ name, logoUrl, color }: { name: string; logoUrl: string | null; color: string | null }) {
  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-bg p-4 flex flex-col gap-3" aria-hidden>
      <div className="flex items-center gap-2.5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-7 max-w-[140px] w-auto object-contain" />
        ) : (
          <span className="w-7 h-7 rounded-md bg-elevated border border-border-strong flex items-center justify-center text-xs font-semibold text-fg">
            {name.trim().charAt(0).toUpperCase() || "W"}
          </span>
        )}
        <span className="text-sm font-medium text-fg truncate">{name}</span>
      </div>
      <p className="text-[13px] text-muted">Hi Sam, your take-home is ready when you are.</p>
      <span
        className={`self-start inline-flex items-center h-9 px-4 rounded-lg text-[13px] font-medium ${color ? "" : "bg-secondary text-bg"}`}
        style={color ? { background: color, color: readableTextOn(color) } : undefined}
      >
        Start your take-home
      </span>
    </div>
  );
}

/* ── Reply-to ───────────────────────────────────────────────────────────── */

type ToastFn = (text: string, tone?: "ok" | "error") => void;

function ReplyToRow({
  slug,
  canEdit,
  growth,
  initial,
  toast,
}: {
  slug: string;
  canEdit: boolean;
  growth: boolean;
  initial: Props["replyTo"];
  toast: ToastFn;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [draft, setDraft] = useState("");
  const [changing, setChanging] = useState(initial.status === "none");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const id = useId();
  const locked = !canEdit || !growth || pending;

  const send = (email: string) =>
    start(async () => {
      setError(null);
      const res = await requestReplyToAction(slug, email).catch(() => null);
      if (!res) return toast("Could not send. Try again.", "error");
      if (!res.ok) {
        setError(res.fieldErrors?.replyToEmail ?? res.error);
        // The address may be saved even when the email failed.
        router.refresh();
        return;
      }
      setState({ email: res.email, status: "waiting", confirmedAt: null });
      setChanging(false);
      setDraft("");
      toast(`Confirmation sent to ${res.email}`);
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      const res = await removeReplyToAction(slug).catch(() => null);
      if (!res?.ok) return toast(res?.error ?? "Could not remove. Try again.", "error");
      setState({ email: null, status: "none", confirmedAt: null });
      setChanging(true);
      toast("Reply-to removed");
      router.refresh();
    });

  return (
    <SettingRow
      label="Reply-to address"
      htmlFor={changing ? id : undefined}
      badge={growth ? undefined : "Growth"}
      help={
        growth
          ? "Where candidates' replies go. We email a link to the address first, and use it once someone confirms it. Until then, candidate emails come from a no-reply address."
          : `${GROWTH_NOTE} Until then, candidate emails come from a no-reply address.`
      }
      error={error}
    >
      {state.email && !changing && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Mail className="w-4 h-4 text-muted" aria-hidden />
            <span className="text-sm text-fg break-all">{state.email}</span>
            {state.status === "confirmed" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success text-xs font-medium px-2 leading-5">
                <Check className="w-3 h-3" aria-hidden /> Confirmed
              </span>
            ) : (
              <span className="rounded-full bg-warning/15 text-warning text-xs font-medium px-2 leading-5">Waiting for confirmation</span>
            )}
          </div>
          {state.status === "waiting" && (
            <p className="text-[13px] text-muted">We emailed a link to this address. It works for 7 days. Replies go here once someone opens it and confirms.</p>
          )}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {state.status === "waiting" && (
                <Btn icon={Send} onClick={() => send(state.email!)} disabled={locked}>
                  Send again
                </Btn>
              )}
              <Btn onClick={() => setChanging(true)} disabled={locked}>
                Change
              </Btn>
              <Btn variant="danger" onClick={remove} disabled={!canEdit || pending}>
                Remove
              </Btn>
            </div>
          )}
        </div>
      )}
      {changing && (
        <form
          className="flex flex-wrap items-center gap-2 w-full"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) send(draft);
          }}
        >
          <TextInput
            id={id}
            type="email"
            value={draft}
            placeholder="jobs@company.com"
            disabled={locked}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            className="!max-w-xs"
          />
          <Btn type="submit" variant="primary" icon={Send} disabled={locked || !draft.trim()}>
            {pending ? "Sending" : "Send confirmation"}
          </Btn>
          {state.email && (
            <Btn variant="quiet" onClick={() => setChanging(false)} disabled={pending}>
              Cancel
            </Btn>
          )}
        </form>
      )}
    </SettingRow>
  );
}

/* ── Wording editor ─────────────────────────────────────────────────────── */

function WordingDialog({
  slug,
  emailKey,
  editable,
  canTest,
  growth,
  saved,
  brandDraft,
  onClose,
  onSaved,
  toast,
}: {
  slug: string;
  emailKey: CandidateEmailKey;
  editable: boolean;
  canTest: boolean;
  growth: boolean;
  saved: SavedWording | null;
  brandDraft: PreviewDraft;
  onClose: () => void;
  onSaved: (next: SavedWording | null) => void;
  toast: ToastFn;
}) {
  const def = CANDIDATE_EMAILS[emailKey];
  const startSubject = saved?.subject ?? def.subject;
  const startBody = saved?.body ?? def.body;
  const [subject, setSubject] = useState(startSubject);
  const [body, setBody] = useState(startBody);
  const [errors, setErrors] = useState<{ subject?: string; body?: string }>({});
  const [preview, setPreview] = useState<{ subject: string; from: string; replyTo: string | null; html: string } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [testing, startTesting] = useTransition();
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocus = useRef<"subject" | "body">("body");
  const seq = useRef(0);
  const subjectId = useId();
  const bodyId = useId();

  const dirty = subject !== startSubject || body !== startBody;
  const isDefault = subject.replace(/\s+/g, " ").trim() === def.subject && body.trim() === def.body;
  const draft = useMemo<PreviewDraft>(() => ({ ...brandDraft, subject, body }), [brandDraft, subject, body]);

  // Refresh the preview shortly after typing stops.
  useEffect(() => {
    const n = ++seq.current;
    const t = setTimeout(async () => {
      const res = await previewEmailAction(slug, emailKey, draft).catch(() => null);
      if (n !== seq.current) return;
      if (!res) return setPreviewError("Could not load the preview.");
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors as { subject?: string; body?: string });
        return setPreviewError(res.error);
      }
      setPreviewError(null);
      setErrors({});
      setPreview(res);
    }, 450);
    return () => clearTimeout(t);
  }, [slug, emailKey, draft]);

  const insert = useCallback(
    (token: string) => {
      const target = lastFocus.current === "subject" ? subjectRef.current : bodyRef.current;
      const value = lastFocus.current === "subject" ? subject : body;
      const setValue = lastFocus.current === "subject" ? setSubject : setBody;
      const startAt = target?.selectionStart ?? value.length;
      const endAt = target?.selectionEnd ?? value.length;
      setValue(value.slice(0, startAt) + token + value.slice(endAt));
      requestAnimationFrame(() => {
        target?.focus();
        target?.setSelectionRange(startAt + token.length, startAt + token.length);
      });
    },
    [subject, body],
  );

  const save = () =>
    startSaving(async () => {
      const res = await saveEmailWordingAction(slug, emailKey, { subject, body }).catch(() => null);
      if (!res) return toast("Could not save. Try again.", "error");
      if (!res.ok) {
        setErrors((res.fieldErrors ?? {}) as { subject?: string; body?: string });
        return toast(res.error, "error");
      }
      onSaved(res.edited ? { subject: res.subject, body: res.body, updatedAt: new Date().toISOString() } : null);
      toast(res.edited ? `${def.label} email saved` : `${def.label} email uses the built-in wording`);
      onClose();
    });

  const reset = () =>
    startSaving(async () => {
      const res = await resetEmailWordingAction(slug, emailKey).catch(() => null);
      if (!res?.ok) return toast(res?.error ?? "Could not reset. Try again.", "error");
      onSaved(null);
      setSubject(def.subject);
      setBody(def.body);
      toast(`${def.label} email reset to the built-in wording`);
    });

  const test = () =>
    startTesting(async () => {
      const res = await sendTestEmailAction(slug, emailKey, draft).catch(() => null);
      if (!res) return toast("Could not send the test. Try again.", "error");
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors as { subject?: string; body?: string });
        return toast(res.error, "error");
      }
      toast(`Test sent to ${res.to}`);
    });

  const requestClose = () => {
    if (editable && dirty && !window.confirm("Close without saving your changes?")) return;
    onClose();
  };

  return (
    <Dialog
      title={`${def.label} email`}
      onClose={requestClose}
      width={1040}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex flex-wrap gap-2">
            {editable && saved && (
              <Btn variant="quiet" icon={RotateCcw} onClick={reset} disabled={saving}>
                Reset to default
              </Btn>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canTest && (
              <Btn icon={Send} onClick={test} disabled={testing || saving}>
                {testing ? "Sending" : "Send me a test"}
              </Btn>
            )}
            <Btn variant="quiet" onClick={requestClose} disabled={saving}>
              {editable ? "Cancel" : "Close"}
            </Btn>
            {editable && (
              <Btn variant="primary" onClick={save} disabled={saving || !dirty}>
                {saving ? "Saving" : "Save wording"}
              </Btn>
            )}
          </div>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col gap-4 min-w-0">
          <p className="text-[13px] text-muted">{def.when}</p>
          {!growth && <p className="rounded-lg border border-border bg-panel px-3 py-2 text-[13px] text-muted">{GROWTH_NOTE} This preview shows the built-in wording with your brand.</p>}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={subjectId} className="text-[13px] font-medium text-fg">
              Subject
            </label>
            <input
              ref={subjectRef}
              id={subjectId}
              value={subject}
              maxLength={SUBJECT_MAX + 20}
              disabled={!editable}
              onFocus={() => (lastFocus.current = "subject")}
              onChange={(e) => setSubject(e.target.value)}
              aria-invalid={!!errors.subject}
              className={`${inputCls} disabled:opacity-60`}
            />
            {errors.subject && (
              <p role="alert" className="text-[13px] text-danger">
                {errors.subject}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={bodyId} className="text-[13px] font-medium text-fg">
                Opening text
              </label>
              <span className="text-xs text-subtle tabular-nums">
                {body.length} / {BODY_MAX}
              </span>
            </div>
            <textarea
              ref={bodyRef}
              id={bodyId}
              value={body}
              rows={9}
              maxLength={BODY_MAX + 200}
              disabled={!editable}
              onFocus={() => (lastFocus.current = "body")}
              onChange={(e) => setBody(e.target.value)}
              aria-invalid={!!errors.body}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[13px] leading-relaxed text-fg placeholder:text-subtle focus:outline-none focus:border-secondary/60 focus:ring-2 focus:ring-secondary/20 disabled:opacity-60 resize-y"
            />
            {errors.body && (
              <p role="alert" className="text-[13px] text-danger">
                {errors.body}
              </p>
            )}
            <p className="text-xs text-subtle">Leave a blank line between paragraphs.</p>
          </div>

          {editable && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-fg">Insert a placeholder</span>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p.token}
                    type="button"
                    onClick={() => insert(p.token)}
                    title={p.label}
                    className="h-7 px-2.5 rounded-md border border-border bg-panel text-xs font-mono text-fg hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
                  >
                    {p.token}
                  </button>
                ))}
              </div>
              <p className="text-xs text-subtle">
                {PLACEHOLDERS.map((p) => `${p.token} is the ${p.label.toLowerCase()}`).join(", ")}.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-panel px-3 py-2.5">
            <p className="text-[13px] font-medium text-fg">Always added below your text</p>
            <p className="text-[13px] text-muted">{def.alwaysAdded} Every email also ends with your help contact, privacy notice and an unsubscribe link.</p>
          </div>
          {editable && isDefault && saved && <p className="text-[13px] text-muted">This matches the built-in wording. Saving goes back to it.</p>}
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-panel px-3 py-2 text-[13px]">
            <span className="text-muted">
              From <span className="text-fg">{preview?.from ?? "Loading"}</span>
              {preview?.replyTo && (
                <>
                  {" "}
                  · Replies to <span className="text-fg">{preview.replyTo}</span>
                </>
              )}
            </span>
            <span className="text-muted truncate">
              Subject <span className="text-fg">{preview?.subject ?? ""}</span>
            </span>
          </div>
          {previewError && <p className="text-[13px] text-danger">{previewError}</p>}
          <iframe
            title={`${def.label} email preview`}
            sandbox=""
            srcDoc={preview?.html ?? ""}
            className="w-full h-[520px] rounded-lg border border-border bg-bg"
          />
          <p className="text-xs text-subtle">A sample with made-up candidate details. Links in the preview do nothing.</p>
        </div>
      </div>
    </Dialog>
  );
}

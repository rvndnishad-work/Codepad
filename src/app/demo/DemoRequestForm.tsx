"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { HIRING_TYPES, MONTHLY_VOLUMES, TEAM_SIZES } from "@/lib/demo-requests/model";

type Errors = Partial<Record<string, string>>;

const inputClass =
  "min-h-11 w-full rounded-md border border-border bg-bg px-3 text-[14px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 aria-[invalid=true]:border-danger";

export default function DemoRequestForm({ source, defaultEmail, defaultName }: { source: string; defaultEmail: string; defaultName: string }) {
  const [teamSize, setTeamSize] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("");
  const [hiringType, setHiringType] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      company: String(fd.get("company") ?? ""),
      jobTitle: String(fd.get("jobTitle") ?? ""),
      message: String(fd.get("message") ?? ""),
      website: String(fd.get("website") ?? ""),
      teamSize,
      monthlyVolume,
      hiringType,
      source,
    };
    setSending(true);
    setFormError(null);
    try {
      const res = await fetch("/api/demo-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(body.email);
        return;
      }
      setErrors(data.errors ?? {});
      setFormError(data.error ?? "We could not send your request. Try again.");
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-5">
        <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div className="text-[14px] leading-relaxed">
          <p className="font-semibold text-fg">Thanks, we have your request.</p>
          <p className="text-muted">We sent a copy to {sent} and will reply within one working day to fix a time.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" error={errors.name} defaultValue={defaultName} autoComplete="name" required />
        <Field label="Work email" name="email" type="email" error={errors.email} defaultValue={defaultEmail} autoComplete="email" required />
        <Field label="Company" name="company" error={errors.company} autoComplete="organization" required />
        <Field label="Your role (optional)" name="jobTitle" error={errors.jobTitle} autoComplete="organization-title" />
      </div>

      <Choice legend="How many people hire with you?" options={TEAM_SIZES} value={teamSize} onChange={setTeamSize} error={errors.teamSize} />
      <Choice legend="Candidates you screen in a month" options={MONTHLY_VOLUMES} value={monthlyVolume} onChange={setMonthlyVolume} error={errors.monthlyVolume} />
      <Choice legend="What do you hire for?" options={HIRING_TYPES} value={hiringType} onChange={setHiringType} error={errors.hiringType} />

      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        Anything we should know? (optional)
        <textarea name="message" rows={4} maxLength={2000} className={`${inputClass} py-2`} />
      </label>

      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {formError ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-[12px] text-muted">
          We use these details only to reply to you. See our{" "}
          <a className="underline" href="/privacy">
            privacy notice
          </a>
          .
        </span>
        <button type="submit" disabled={sending} className="ip-btn ip-btn-primary disabled:opacity-60">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Send request
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  error,
  defaultValue,
  autoComplete,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  defaultValue?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const id = `demo-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] text-muted">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={inputClass}
      />
      {error ? (
        <span id={`${id}-err`} className="text-[12px] text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function Choice({
  legend,
  options,
  value,
  onChange,
  error,
}: {
  legend: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[13px] text-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={`min-h-10 rounded-md border px-3.5 text-[13px] font-medium transition-colors ${
                on ? "border-accent bg-accent/10 text-fg" : "border-border text-muted hover:border-border-strong hover:text-fg"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {error ? <span className="text-[12px] text-danger">{error}</span> : null}
    </fieldset>
  );
}

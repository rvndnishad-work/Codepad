"use client";

/**
 * Settings > General. Name, web address, time zone and date format save
 * together through the save bar; the logo uploads on its own as soon as a
 * file is picked. The aside lists the latest settings changes from the
 * audit log.
 */
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Trash2 } from "lucide-react";
import { Avatar, Btn, useToasts } from "../../candidates/_components/ui";
import { SaveBar, Segmented, Select, SettingRow, SettingsCard, TextInput, useSettingsForm } from "../_components/form";
import { DATE_FORMATS, formatWorkspaceDate, type DateFormat } from "@/lib/workspace/settings";
import { LOGO_MAX_BYTES, LOGO_TYPES, checkLogoFile } from "@/lib/workspace/screening-defaults";
import { relativeTime } from "@/lib/workspace/display";
import { checkSlugAction, removeLogoAction, uploadLogoAction, type SlugCheck } from "./actions";

export type RecentChange = { id: string; title: string; detail: string | null; actor: string; at: string; path: string | null };

type Values = { name: string; slug: string; timezone: string; dateFormat: DateFormat };

type Props = {
  slug: string;
  workspaceId: string;
  origin: string;
  now: string;
  canEdit: boolean;
  owner: boolean;
  initial: Values;
  logoUrl: string | null;
  timezones: { value: string; label: string }[];
  owners: { userId: string; name: string; email: string | null; me: boolean }[];
  recent: RecentChange[];
  canReadAudit: boolean;
};

export default function GeneralSettings({ slug, origin, now, canEdit, owner, initial, logoUrl, timezones, owners, recent, canReadAudit }: Props) {
  const form = useSettingsForm<Values>({ slug, group: "general", initial, canEdit });
  const { values, set, errors, disabled } = form;
  const nowDate = new Date(now);
  const host = origin.replace(/^https?:\/\//, "");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
      <div className="flex flex-col gap-5 min-w-0">
        <SettingsCard title="Workspace" description="How your team and your candidates see this workspace.">
          <SettingRow label="Workspace name" help="Shown in the sidebar, on candidate pages and in emails." error={errors.name} htmlFor="ws-name">
            <TextInput id="ws-name" value={values.name} maxLength={100} onChange={(e) => set("name", e.target.value)} disabled={disabled} autoComplete="organization" />
          </SettingRow>
          <SlugRow slug={slug} host={host} value={values.slug} saved={initial.slug} onChange={(v) => set("slug", v)} error={errors.slug} disabled={disabled || !owner} owner={owner} />
          <LogoRow slug={slug} initialUrl={logoUrl} disabled={!canEdit} />
        </SettingsCard>

        <SettingsCard
          title="Time and dates"
          description="The workspace clock, for dates written out for everyone, such as in candidate emails and exports. Your own screens keep showing your own time."
        >
          <SettingRow
            label="Time zone"
            help={`It is ${formatWorkspaceDate(nowDate, { timezone: values.timezone, dateFormat: values.dateFormat }, true)} there now.`}
            error={errors.timezone}
            htmlFor="ws-tz"
          >
            <Select id="ws-tz" label="Time zone" value={values.timezone} onChange={(v) => set("timezone", v)} options={timezones} disabled={disabled} />
          </SettingRow>
          <SettingRow label="Date format" help="How dates are written out." error={errors.dateFormat}>
            <Segmented
              label="Date format"
              value={values.dateFormat}
              onChange={(v) => set("dateFormat", v)}
              disabled={disabled}
              options={DATE_FORMATS.map((f) => ({ value: f.id, label: formatWorkspaceDate(nowDate, { timezone: values.timezone, dateFormat: f.id }) }))}
            />
          </SettingRow>
        </SettingsCard>

        <OwnersCard slug={slug} owners={owners} />
      </div>

      <RecentChanges slug={slug} recent={recent} now={nowDate} canReadAudit={canReadAudit} />
      <SaveBar form={form} />
    </div>
  );
}

/* ── Web address ────────────────────────────────────────────────────────── */

function SlugRow({
  slug,
  host,
  value,
  saved,
  onChange,
  error,
  disabled,
  owner,
}: {
  slug: string;
  host: string;
  value: string;
  saved: string;
  onChange: (v: string) => void;
  error?: string;
  disabled: boolean;
  owner: boolean;
}) {
  const [check, setCheck] = useState<SlugCheck | null>(null);
  const changed = value.trim().toLowerCase() !== saved;

  // Check the address a moment after typing stops. The save checks again.
  useEffect(() => {
    if (!changed || !value.trim()) {
      setCheck(null);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      checkSlugAction(slug, value)
        .then((r) => live && setCheck(r))
        .catch(() => live && setCheck(null));
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [slug, value, changed]);

  const hint = error ? null : check;
  return (
    <SettingRow
      label="Web address"
      badge={owner ? undefined : "Owners only"}
      help="Links to the old address keep working: they open the same page at the new one."
      error={error}
      htmlFor="ws-slug"
    >
      <div className={`flex items-center w-full max-w-md rounded-lg border border-border bg-bg focus-within:border-secondary/60 focus-within:ring-2 focus-within:ring-secondary/20 ${disabled ? "opacity-50" : ""}`}>
        <span className="pl-3 pr-0.5 text-[13px] text-subtle whitespace-nowrap truncate max-w-[55%]" title={`${host}/w/`}>
          {host}/w/
        </span>
        <input
          id="ws-slug"
          value={value}
          maxLength={48}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          className="h-9 flex-1 min-w-0 bg-transparent pr-3 text-[13px] text-fg placeholder:text-subtle focus:outline-none"
          aria-describedby="ws-slug-hint"
        />
      </div>
      <p id="ws-slug-hint" aria-live="polite" className={`text-[13px] ${hint?.state === "available" ? "text-success" : hint && hint.state !== "same" ? "text-danger" : "text-muted"}`}>
        {hint && hint.state !== "same" ? hint.message : changed && !error ? "Checking" : ""}
      </p>
    </SettingRow>
  );
}

/* ── Logo ───────────────────────────────────────────────────────────────── */

function LogoRow({ slug, initialUrl, disabled }: { slug: string; initialUrl: string | null; disabled: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [toasts, toast] = useToasts();

  const pick = (file: File | undefined) => {
    if (!file) return;
    const check = checkLogoFile(file);
    if (!check.ok) return setError(check.error);
    setError(null);
    const data = new FormData();
    data.set("logo", file);
    start(async () => {
      const res = await uploadLogoAction(slug, data).catch(() => null);
      if (!res || !res.ok) {
        setError(res && !res.ok ? res.error : "Could not upload the logo. Try again.");
        return;
      }
      setUrl(res.logoUrl);
      toast("Logo saved");
      router.refresh();
    });
  };

  const remove = () =>
    start(async () => {
      const res = await removeLogoAction(slug).catch(() => null);
      if (!res || !res.ok) {
        toast(res && !res.ok ? res.error : "Could not remove the logo. Try again.", "error");
        return;
      }
      setUrl(null);
      toast("Logo removed");
      router.refresh();
    });

  return (
    <SettingRow
      label="Logo"
      help={`Shown on candidate pages and in candidate emails. PNG, JPG or WebP up to ${Math.round(LOGO_MAX_BYTES / 1024)} KB; a square image works best. Saved as soon as you upload it.`}
      error={error}
    >
      {toasts}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-14 h-14 rounded-xl border border-border bg-bg flex items-center justify-center overflow-hidden shrink-0">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Workspace logo" className="max-w-full max-h-full object-contain" />
          ) : (
            <ImageUp className="w-5 h-5 text-subtle" aria-hidden />
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept={LOGO_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Btn icon={ImageUp} onClick={() => input.current?.click()} disabled={disabled || busy}>
          {busy ? "Saving" : url ? "Replace" : "Upload logo"}
        </Btn>
        {url && (
          <Btn variant="quiet" icon={Trash2} onClick={remove} disabled={disabled || busy}>
            Remove
          </Btn>
        )}
      </div>
    </SettingRow>
  );
}

/* ── Owners ─────────────────────────────────────────────────────────────── */

function OwnersCard({ slug, owners }: { slug: string; owners: Props["owners"] }) {
  const single = owners.length === 1;
  return (
    <SettingsCard
      title="Owners"
      description="Owners can change every setting, including the web address, two-factor sign-in for everyone and deleting the workspace."
      aside={
        <Btn href={`/w/${slug}/members`} size="sm">
          Manage in Members
        </Btn>
      }
    >
      <ul className="flex flex-col">
        {owners.map((o) => (
          <li key={o.userId} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-b-0">
            <Avatar name={o.name} size={28} />
            <div className="flex flex-col min-w-0">
              <span className="text-sm text-fg truncate">
                {o.name}
                {o.me && <span className="text-muted"> (you)</span>}
              </span>
              {o.email && o.email !== o.name && <span className="text-[13px] text-muted truncate">{o.email}</span>}
            </div>
          </li>
        ))}
        {!owners.length && <li className="px-5 py-3 text-[13px] text-muted">No owners found.</li>}
      </ul>
      {single && (
        <div className="px-5 py-3 text-[13px] text-muted bg-panel/40">
          This workspace has one owner. Add a second owner from Members so someone can always manage it.
        </div>
      )}
    </SettingsCard>
  );
}

/* ── Recent changes ─────────────────────────────────────────────────────── */

function RecentChanges({ slug, recent, now, canReadAudit }: { slug: string; recent: RecentChange[]; now: Date; canReadAudit: boolean }) {
  return (
    <aside aria-labelledby="recent-changes" className="rounded-xl border border-border bg-surface lg:sticky lg:top-4">
      <h2 id="recent-changes" className="px-4 pt-4 pb-2 text-sm font-semibold text-fg">
        Recent settings changes
      </h2>
      {recent.length ? (
        <ol className="flex flex-col px-4 pb-2">
          {recent.map((r) => (
            <li key={r.id} className="py-2.5 border-t border-border first:border-t-0 flex flex-col gap-0.5 min-w-0">
              {r.path ? (
                <Link href={`/w/${slug}/${r.path}`} className="text-[13px] text-fg hover:underline">
                  {r.title}
                </Link>
              ) : (
                <span className="text-[13px] text-fg">{r.title}</span>
              )}
              {r.detail && <span className="text-[13px] text-muted break-words">{r.detail}</span>}
              <span className="text-xs text-subtle">
                {r.actor} · <span suppressHydrationWarning>{relativeTime(r.at, now)}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 pb-4 text-[13px] text-muted">No changes yet. Changes to any settings tab show up here.</p>
      )}
      {canReadAudit && (
        <div className="px-4 py-3 border-t border-border">
          <Link href={`/w/${slug}/audit?category=settings&range=all`} className="text-[13px] font-medium text-secondary-soft hover:underline">
            See all in the audit log
          </Link>
        </div>
      )}
    </aside>
  );
}


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
import { ImageUp, Trash2, UserCog } from "lucide-react";
import { Avatar, Btn, useToasts } from "../../candidates/_components/ui";
import { SaveBar, Segmented, Select, SettingRow, SettingsCard, TextInput, useSettingsForm } from "../_components/form";
import { DATE_FORMATS, SETTINGS_TABS, formatWorkspaceDate, type DateFormat } from "@/lib/workspace/settings";
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
          <LogoRow slug={slug} name={values.name || initial.name} initialUrl={logoUrl} disabled={!canEdit} />
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
  const hintText =
    hint && hint.state !== "same"
      ? hint.state === "available"
        ? `${hint.message} The old address ${saved} will redirect here.`
        : hint.message
      : changed && !error
        ? "Checking"
        : `Your workspace lives at ${host}/w/${saved}.`;
  return (
    <SettingRow
      label="Web address"
      badge={owner ? undefined : "Owners only"}
      help="Links to the old address keep working: they open the same page at the new one."
      error={error}
      htmlFor="ws-slug"
    >
      <div className={`flex items-stretch w-full max-w-md rounded-lg border border-border bg-bg overflow-hidden focus-within:border-secondary/60 focus-within:ring-2 focus-within:ring-secondary/20 ${disabled ? "opacity-50" : ""}`}>
        <span className="flex items-center px-3 border-r border-border bg-panel font-mono text-[13px] text-subtle whitespace-nowrap truncate max-w-[55%]" title={`${host}/w/`}>
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
          className="h-9 flex-1 min-w-0 bg-transparent px-3 font-mono text-[13px] text-fg placeholder:text-subtle focus:outline-none"
          aria-describedby="ws-slug-hint"
        />
      </div>
      <p id="ws-slug-hint" aria-live="polite" className={`text-[13px] break-all ${hint?.state === "available" ? "text-success" : hint && hint.state !== "same" ? "text-danger" : "text-muted"}`}>
        {hintText}
      </p>
    </SettingRow>
  );
}

/* ── Logo ───────────────────────────────────────────────────────────────── */

function LogoRow({ slug, name, initialUrl, disabled }: { slug: string; name: string; initialUrl: string | null; disabled: boolean }) {
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
        {url ? (
          <div className="w-14 h-14 rounded-xl border border-border bg-bg flex items-center justify-center overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Workspace logo" className="max-w-full max-h-full object-contain" />
          </div>
        ) : (
          <div aria-hidden className="w-14 h-14 rounded-xl bg-secondary text-bg flex items-center justify-center shrink-0 text-2xl font-semibold">
            {(name.trim()[0] ?? "W").toUpperCase()}
          </div>
        )}
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
        {!url && !busy && <span className="text-[13px] text-muted">No logo yet, so we show the first letter.</span>}
      </div>
    </SettingRow>
  );
}

/* ── Owners ─────────────────────────────────────────────────────────────── */

function OwnersCard({ slug, owners }: { slug: string; owners: Props["owners"] }) {
  const single = owners.length === 1;
  return (
    <SettingsCard title="Ownership">
      <SettingRow
        label="Owners"
        help="Owners can change every setting, including the web address, two-factor sign-in for everyone and deleting the workspace."
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {owners.length ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Owners">
              {owners.map((o) => (
                <li
                  key={o.userId}
                  title={o.email ?? undefined}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel pl-1 pr-3 h-8 text-[13px] text-fg max-w-full"
                >
                  <Avatar name={o.name} size={24} />
                  <span className="truncate">{o.name}</span>
                  {o.me && <span className="text-muted">(you)</span>}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-[13px] text-muted">No owners found.</span>
          )}
          {single && (
            <span className="text-[13px] text-warning">
              This workspace has one owner. Add a second owner from Members so someone can always manage it.
            </span>
          )}
        </div>
        <Btn href={`/w/${slug}/members`} icon={UserCog} className="mt-1">
          Transfer or add an owner
        </Btn>
      </SettingRow>
    </SettingsCard>
  );
}

/* ── Recent changes ─────────────────────────────────────────────────────── */

const TAB_LABELS: Record<string, string> = Object.fromEntries(SETTINGS_TABS.map((t) => [`settings/${t.id}`, t.label]));

function RecentChanges({ slug, recent, now, canReadAudit }: { slug: string; recent: RecentChange[]; now: Date; canReadAudit: boolean }) {
  return (
    <aside aria-labelledby="recent-changes" className="flex flex-col gap-2 lg:sticky lg:top-4 min-w-0">
      <h2 id="recent-changes" className="px-1 text-[13px] font-semibold text-muted">
        Recent changes to settings
      </h2>
      <div className="rounded-xl border border-border bg-surface shadow-sm shadow-black/5">
        {recent.length ? (
          <ol className="flex flex-col px-4 py-1">
            {recent.map((r) => {
              const tab = r.path ? TAB_LABELS[r.path] : undefined;
              return (
                <li key={r.id} className="py-3 border-t border-border first:border-t-0 flex flex-col gap-1 min-w-0">
                  {r.path ? (
                    <Link href={`/w/${slug}/${r.path}`} className="text-[13px] font-medium text-fg hover:underline">
                      {r.title}
                    </Link>
                  ) : (
                    <span className="text-[13px] font-medium text-fg">{r.title}</span>
                  )}
                  {r.detail && <span className="text-[13px] text-muted break-words">{r.detail}</span>}
                  <span className="text-xs text-subtle">
                    {tab ? `${tab} · ` : ""}
                    {r.actor} · <span suppressHydrationWarning>{relativeTime(r.at, now)}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-4 py-4 text-[13px] text-muted">No changes yet. Changes to any settings tab show up here.</p>
        )}
        {canReadAudit && (
          <div className="px-4 py-3 border-t border-border">
            <Link href={`/w/${slug}/audit?category=settings&range=all`} className="text-[13px] font-medium text-secondary-soft hover:underline">
              See all in the audit log
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

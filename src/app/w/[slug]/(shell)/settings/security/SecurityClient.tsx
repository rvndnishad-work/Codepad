"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, Plus, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Avatar, Btn, inputCls, useToasts } from "../../candidates/_components/ui";
import { ConfirmDialog } from "../../candidates/_components/dialogs";
import { SaveBar, Segmented, Select, SettingRow, SettingsCard, Toggle, useSettingsForm } from "../_components/form";
import { relativeTime, plural } from "@/lib/workspace/display";
import { ROLE_LABELS } from "@/lib/workspace/members";
import {
  API_KEY_LIFETIME_CHOICES,
  JOIN_ROLES,
  MAX_ALLOWED_DOMAINS,
  SESSION_MAX_AGE_CHOICES,
  formatWorkspaceDate,
  normalizeDomains,
  type DateFormat,
} from "@/lib/workspace/settings";
import {
  defaultTwoFactorStart,
  membersOutsideDomains,
  twoFactorPolicy,
  twoFactorReminderWait,
} from "@/lib/workspace/security";
import { sendTwoFactorReminderAction, signOutEveryoneAction } from "./actions";

type Values = {
  require2faForAll: boolean;
  /** "YYYY-MM-DD" or "" for straight away. */
  require2faFrom: string;
  sessionMaxAgeDays: number | null;
  allowedEmailDomains: string[];
  joinWithoutInvite: boolean;
  joinRole: string;
  apiKeyMaxLifetimeDays: number | null;
};

type Member = { id: string; name: string; email: string | null; role: string; twoFactorOn: boolean };
type FlaggedKey = { id: string; label: string; keyPreview: string; expiresAt: string | null; lastUsedAt: string | null; createdAt: string };

type Props = {
  slug: string;
  workspaceName: string;
  canEdit: boolean;
  owner: boolean;
  paidPlan: boolean;
  myTwoFactorOn: boolean;
  now: string;
  initial: Values;
  /** Saved values and stamps the page reads outside the form. */
  saved: {
    require2faForAll: boolean;
    require2faFrom: string | null;
    require2faRemindedAt: string | null;
    sessionsRevokedAt: string | null;
    timezone: string;
    dateFormat: DateFormat;
  };
  members: Member[];
  flaggedKeys: FlaggedKey[];
  liveKeyCount: number;
};

const days = (n: number) => (n === 365 ? "1 year" : `${n} ${n === 1 ? "day" : "days"}`);
const SHOW_NAMES = 6;
const SSO_PROVIDERS = ["Okta", "Microsoft Entra ID", "Google Workspace", "Other SAML"];

export default function SecurityClient(props: Props) {
  const { slug, canEdit, owner, paidPlan, myTwoFactorOn, initial, saved, members, flaggedKeys, liveKeyCount, workspaceName } = props;
  const router = useRouter();
  const form = useSettingsForm<Values>({ slug, group: "security", initial, canEdit });
  const { values, set, errors, disabled } = form;
  const now = new Date(props.now);
  const fmt = (iso: string, withTime = false) => formatWorkspaceDate(iso, saved, withTime);

  const [toastNode, toast] = useToasts();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [busy, start] = useTransition();

  /* Two-factor */
  const ownerLocked = disabled || !owner;
  const savedPolicy = twoFactorPolicy({
    require2faForAll: saved.require2faForAll,
    require2faFrom: saved.require2faFrom ? new Date(saved.require2faFrom) : null,
  }, now);
  const without2fa = members.filter((m) => !m.twoFactorOn);
  const reminderWait = twoFactorReminderWait(saved.require2faRemindedAt ? new Date(saved.require2faRemindedAt) : null, now);
  const today = now.toISOString().slice(0, 10);

  const toggle2fa = (on: boolean) => {
    set("require2faForAll", on);
    if (on && !values.require2faFrom) set("require2faFrom", defaultTwoFactorStart(now));
    if (!on) set("require2faFrom", "");
  };

  const sendReminder = () =>
    start(async () => {
      const res = await sendTwoFactorReminderAction(slug).catch(() => null);
      if (!res) return toast("Could not send the emails. Try again.", "error");
      if (!res.ok) return toast(res.error, "error");
      toast(res.message);
      router.refresh();
    });

  /* Sign out everyone */
  const signOutEveryone = () =>
    start(async () => {
      const res = await signOutEveryoneAction(slug).catch(() => null);
      if (!res) return toast("Could not sign everyone out. Try again.", "error");
      if (!res.ok) return toast(res.error, "error");
      setConfirmSignOut(false);
      // A full load so the workspace gate signs this browser out too.
      window.location.assign(`/w/${slug}`);
    });

  /* Domains */
  const [domainDraft, setDomainDraft] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const addDomains = () => {
    if (!domainDraft.trim()) return;
    const parsed = normalizeDomains([...values.allowedEmailDomains, ...domainDraft.split(/[\s,;]+/)]);
    if (!parsed.ok) return setDomainError(parsed.error);
    set("allowedEmailDomains", parsed.value);
    setDomainDraft("");
    setDomainError(null);
  };
  const removeDomain = (d: string) => {
    const next = values.allowedEmailDomains.filter((x) => x !== d);
    set("allowedEmailDomains", next);
    // Joining without an invite only works with at least one domain.
    if (!next.length && values.joinWithoutInvite) set("joinWithoutInvite", false);
  };
  const outside = membersOutsideDomains({ allowedEmailDomains: values.allowedEmailDomains }, members);

  return (
    <div className="flex flex-col gap-5">
      {toastNode}

      <SettingsCard
        id="two-factor"
        title="Two-factor sign-in"
        description="A 6-digit code from an authenticator app, asked for on top of the password when someone signs in."
      >
        <SettingRow
          label="Require two-factor for everyone"
          badge={owner ? undefined : "Owners only"}
          help={
            paidPlan
              ? "Owners and admins on this plan always need it. Turn this on to ask every member."
              : "Every member is asked to set it up before they can open the workspace."
          }
          error={errors.require2faForAll}
        >
          <Toggle checked={values.require2faForAll} onChange={toggle2fa} label="Require two-factor for everyone" disabled={ownerLocked} />
          {values.require2faForAll && (
            <div className="flex flex-col gap-1.5 mt-2 w-full max-w-md">
              <label htmlFor="require2faFrom" className="text-[13px] font-medium text-fg">
                Required from
              </label>
              <input
                id="require2faFrom"
                type="date"
                min={today}
                value={values.require2faFrom}
                onChange={(e) => set("require2faFrom", e.target.value)}
                disabled={ownerLocked}
                className={`${inputCls} max-w-[200px] disabled:opacity-50`}
              />
              <p className="text-[13px] text-muted">
                Gives people time to set it up. Leave it empty to require it straight away.
              </p>
              {errors.require2faFrom && (
                <p role="alert" className="text-[13px] text-danger">
                  {errors.require2faFrom}
                </p>
              )}
              {!myTwoFactorOn && (
                <p className="text-[13px] text-warning">
                  You do not have two-factor on yet.{" "}
                  <Link href="/profile/security" className="font-medium underline underline-offset-2 hover:text-fg">
                    Set it up now
                  </Link>
                </p>
              )}
            </div>
          )}
        </SettingRow>

        <SettingRow
          label="Members without two-factor"
          help={
            without2fa.length
              ? `${without2fa.length} of ${plural(members.length, "member")} have not set it up.`
              : "Everyone has it on."
          }
        >
          {without2fa.length > 0 && (
            <div className="w-full flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-lg border border-warning/25 bg-warning/10 px-3.5 py-2.5">
              <ShieldAlert className="w-4 h-4 text-warning shrink-0" aria-hidden />
              <p className="flex-1 min-w-[200px] text-[13px] text-warning">
                {plural(without2fa.length, "member")} {without2fa.length === 1 ? "has" : "have"} not set it up:{" "}
                <span className="text-fg">
                  {without2fa
                    .slice(0, SHOW_NAMES)
                    .map((m) => m.name)
                    .join(", ")}
                  {without2fa.length > SHOW_NAMES ? ` and ${without2fa.length - SHOW_NAMES} more` : ""}
                </span>
                .
              </p>
              {canEdit && (
                <Btn icon={Mail} onClick={sendReminder} disabled={busy || savedPolicy.state === "off" || reminderWait > 0}>
                  Email them now
                </Btn>
              )}
            </div>
          )}
          {without2fa.length === 0 && (
            <p className="inline-flex items-center gap-1.5 text-[13px] text-muted">
              <ShieldCheck className="w-4 h-4 text-success" aria-hidden /> Nothing to do
            </p>
          )}
          {canEdit && without2fa.length > 0 && (
            <span className="text-[13px] text-muted">
              {savedPolicy.state === "off"
                ? "Save two-factor for everyone first."
                : saved.require2faRemindedAt
                  ? `Last emailed ${relativeTime(saved.require2faRemindedAt, now).toLowerCase()}.`
                  : savedPolicy.state === "scheduled"
                    ? `Required from ${fmt(savedPolicy.from.toISOString())}.`
                    : "Required now."}
            </span>
          )}
        </SettingRow>
      </SettingsCard>

      <SettingsCard id="sign-in" title="Sign-in" description="How long a sign-in lasts in this workspace, and a way to end every sign-in at once.">
        <SettingRow
          label="Sign-in lasts"
          help="Counted from when someone signs in. After this they sign in again before they can open the workspace. The site default only signs people out after 30 days without a visit."
          error={errors.sessionMaxAgeDays}
        >
          <Segmented
            label="Sign-in lasts"
            value={values.sessionMaxAgeDays}
            onChange={(v) => set("sessionMaxAgeDays", v)}
            disabled={disabled}
            options={[{ value: null, label: "Site default" }, ...SESSION_MAX_AGE_CHOICES.map((d) => ({ value: d as number | null, label: days(d) }))]}
          />
        </SettingRow>
        <SettingRow
          label="Sign out everyone"
          help="Ends every sign-in to this workspace, including yours. Use it if a laptop goes missing or someone leaves in a hurry."
        >
          <Btn variant="danger" onClick={() => setConfirmSignOut(true)} disabled={!canEdit || busy}>
            Sign out everyone
          </Btn>
          {saved.sessionsRevokedAt && (
            <span className="text-[13px] text-muted">Last done {fmt(saved.sessionsRevokedAt, true)}.</span>
          )}
        </SettingRow>
      </SettingsCard>

      <SettingsCard id="joining" title="Who can join" description="Keep invites to your company email, and let colleagues join on their own.">
        <SettingRow
          label="Allowed email domains"
          htmlFor="domain-input"
          help="Invites only go to addresses at these domains. Subdomains count too. Leave it empty to allow any address."
          error={errors.allowedEmailDomains ?? domainError}
        >
          <div className="flex flex-wrap items-center gap-1.5 w-full">
            {values.allowedEmailDomains.length > 0 && (
              <ul className="contents" aria-label="Allowed domains">
                {values.allowedEmailDomains.map((d) => (
                  <li key={d} className={`inline-flex items-center gap-1 rounded-full border border-border bg-panel h-8 text-[13px] text-fg ${disabled ? "px-3" : "pl-3 pr-1"}`}>
                    {d}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => removeDomain(d)}
                        aria-label={`Remove ${d}`}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-fg hover:bg-surface"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!disabled && values.allowedEmailDomains.length < MAX_ALLOWED_DOMAINS && (
              <form
                className="flex items-center gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  addDomains();
                }}
              >
                <input
                  id="domain-input"
                  value={domainDraft}
                  onChange={(e) => {
                    setDomainDraft(e.target.value);
                    setDomainError(null);
                  }}
                  placeholder="Add a domain"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={inputCls.replace("w-full", "w-44")}
                />
                <Btn type="submit" icon={Plus} disabled={!domainDraft.trim()}>
                  Add
                </Btn>
              </form>
            )}
          </div>
          {disabled && !values.allowedEmailDomains.length && <p className="text-[13px] text-muted">Any address</p>}
          {outside.length > 0 && (
            <p className="text-[13px] text-muted">
              {outside.length === 1
                ? `${outside[0].name} uses another domain and keeps access.`
                : `${outside.length} members use other domains and keep access.`}
            </p>
          )}
        </SettingRow>
        <SettingRow
          label="Join without an invite"
          help="People who sign in with an email at an allowed domain see this workspace in their list and can join. Seats still count."
          error={errors.joinWithoutInvite}
        >
          <Toggle
            checked={values.joinWithoutInvite}
            onChange={(v) => set("joinWithoutInvite", v)}
            label="Join without an invite"
            disabled={disabled || (!values.allowedEmailDomains.length && !values.joinWithoutInvite)}
          />
          {!values.allowedEmailDomains.length && <p className="text-[13px] text-muted">Add an allowed domain first.</p>}
        </SettingRow>
        {values.joinWithoutInvite && (
          <SettingRow label="Role for people who join" htmlFor="join-role" help="You can change anyone's role later on Members." error={errors.joinRole}>
            <Select
              id="join-role"
              label="Role for people who join"
              value={values.joinRole}
              onChange={(v) => set("joinRole", v)}
              disabled={disabled}
              options={JOIN_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] ?? r }))}
            />
          </SettingRow>
        )}
      </SettingsCard>

      <SettingsCard id="api-keys" title="API keys" description="Keys let scripts and AI tools such as Claude read this workspace.">
        <SettingRow
          label="Longest API key lifetime"
          help="New keys must expire within this. Existing keys keep their expiry until someone rotates them."
          error={errors.apiKeyMaxLifetimeDays}
        >
          <Segmented
            label="Longest API key lifetime"
            value={values.apiKeyMaxLifetimeDays}
            onChange={(v) => set("apiKeyMaxLifetimeDays", v)}
            disabled={disabled}
            options={[{ value: null, label: "No limit" }, ...API_KEY_LIFETIME_CHOICES.map((d) => ({ value: d as number | null, label: days(d) }))]}
          />
        </SettingRow>
        {canEdit && (
          <SettingRow
            label={initial.apiKeyMaxLifetimeDays ? "Keys over the limit" : "Keys that never expire"}
            help={
              initial.apiKeyMaxLifetimeDays
                ? `Active keys that last longer than ${days(initial.apiKeyMaxLifetimeDays)}. Rotating one brings it within the limit.`
                : "Active keys with no expiry keep working until someone revokes them."
            }
          >
            {flaggedKeys.length === 0 ? (
              <p className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                <ShieldCheck className="w-4 h-4 text-success" aria-hidden />
                {liveKeyCount ? "None. Every active key has an expiry within the limit." : "There are no active keys."}
              </p>
            ) : (
              <ul className="w-full max-w-xl divide-y divide-border rounded-lg border border-border">
                {flaggedKeys.map((k) => (
                  <li key={k.id} className="flex items-center gap-3 px-3 py-2.5">
                    <KeyRound className="w-4 h-4 text-muted shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-fg truncate">{k.label}</div>
                      <div className="text-xs text-subtle">
                        <span className="font-mono">{k.keyPreview}</span>
                        {" · "}
                        {k.expiresAt ? `Expires ${fmt(k.expiresAt)}` : "Never expires"}
                        {" · "}
                        {k.lastUsedAt ? `Used ${relativeTime(k.lastUsedAt, now).toLowerCase()}` : "Never used"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/w/${slug}/api-keys`} className="text-[13px] font-medium text-secondary-soft hover:text-fg transition-colors">
              Manage keys
            </Link>
          </SettingRow>
        )}
      </SettingsCard>

      <section id="sso" className="rounded-xl border border-dashed border-border-strong bg-surface/60">
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3.5">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Single sign-on and provisioning</h2>
            <p className="text-[13px] text-muted max-w-2xl">Sign in through your company identity provider, and add or remove members from it automatically.</p>
          </div>
          <span className="rounded-full bg-fg text-bg text-xs font-semibold px-2.5 leading-6">Enterprise</span>
        </header>
        <div className="divide-y divide-dashed divide-border border-t border-dashed border-border">
          <SettingRow label="Single sign-on" help="Members sign in through your company login. SAML or OpenID Connect.">
            <ul className="flex flex-wrap gap-2" aria-label="Identity providers">
              {SSO_PROVIDERS.map((p) => (
                <li key={p}>
                  <Btn href={`mailto:sales@interviewpad.dev?subject=${encodeURIComponent(`Single sign-on with ${p} for ${workspaceName}`)}`}>{p}</Btn>
                </li>
              ))}
            </ul>
          </SettingRow>
          <SettingRow label="Automatic provisioning" help="People added or removed in your directory join or leave here too (SCIM).">
            <div className="flex flex-wrap items-center gap-3">
              <Btn variant="primary" href={`mailto:sales@interviewpad.dev?subject=${encodeURIComponent(`Single sign-on for ${workspaceName}`)}`}>
                Talk to us
              </Btn>
              <span className="text-[13px] text-muted">Part of the Enterprise plan. Tell us which identity provider you use and we will set it up with you.</span>
            </div>
          </SettingRow>
        </div>
      </section>

      {confirmSignOut && (
        <ConfirmDialog
          title="Sign out everyone?"
          body={
            <>
              Every member of this workspace, you included, has to sign in again before they can open it. Anything they have not saved may be lost.
            </>
          }
          confirmLabel="Sign out everyone"
          danger
          busy={busy}
          onCancel={() => setConfirmSignOut(false)}
          onConfirm={signOutEveryone}
        />
      )}

      <SaveBar form={form} />
    </div>
  );
}

"use client";

/**
 * Members dialogs that do more than one thing: remove with a handover,
 * make an owner or hand ownership over, and invite several people.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Btn, Dialog, inputCls } from "../candidates/_components/ui";
import { plural } from "@/lib/workspace/display";
import { INVITABLE_ROLES, ROLE_LABELS } from "@/lib/workspace/members";
import { checkHandover, type HandoverChoices, type HandoverCounts } from "@/lib/workspace/handover";
import {
  classifyInvites,
  INVITE_ISSUE_LABELS,
  INVITE_TTL_DAYS,
  MAX_BULK_INVITES,
  parseInviteList,
  sendableInvites,
} from "@/lib/workspace/bulk-invite";
import { bulkInviteAction, changeOwnerAction, loadHandoverAction, removeMemberAction, type HandoverPreviewResult } from "./actions";

/** The shared input style without its full width, for selects that sit inline. */
const fixedInputCls = inputCls.replace("w-full", "");

const roleLabel = (r: string) => ROLE_LABELS[r] ?? r.charAt(0) + r.slice(1).toLowerCase();

type Person = { id: string; userId: string; name: string | null; email: string | null; role: string; twoFactor?: boolean };
const displayName = (m: { name: string | null; email: string | null }) => m.name || m.email || "Unnamed member";

type Notify = (text: string, tone?: "ok" | "error") => void;

/* ───────────────────────────── Remove with handover ───────────────────────────── */

type Loaded = Extract<HandoverPreviewResult, { ok: true }>;

function PersonSelect({
  id,
  value,
  onChange,
  people,
  placeholder,
  error,
}: {
  id: string;
  value: string | null;
  onChange: (v: string | null) => void;
  people: Loaded["people"];
  placeholder: string;
  error?: string;
}) {
  return (
    <>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        aria-invalid={error ? true : undefined}
        className={`${inputCls} ${error ? "border-danger/60" : ""}`}
      >
        <option value="">{placeholder}</option>
        {people.map((p) => (
          <option key={p.userId} value={p.userId}>
            {p.name}
            {p.isMe ? " (you)" : ""}, {roleLabel(p.role).toLowerCase()}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </>
  );
}

export function RemoveMemberDialog({
  slug,
  member,
  onClose,
  onDone,
  notify,
}: {
  slug: string;
  member: Person;
  onClose: () => void;
  onDone: () => void;
  notify: Notify;
}) {
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [choices, setChoices] = useState<HandoverChoices>({ ownerUserId: null, interviewMode: "reassign", interviewerUserId: null, reviewerUserId: null });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void loadHandoverAction(slug, member.id).then((res) => {
      if (!live) return;
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      setData(res);
      // Start with the person removing them, when they can take work.
      const me = res.people.find((p) => p.isMe)?.userId ?? null;
      setChoices((c) => ({ ...c, ownerUserId: me, interviewerUserId: me, reviewerUserId: me }));
    });
    return () => {
      live = false;
    };
  }, [slug, member.id]);

  const set = <K extends keyof HandoverChoices>(k: K, v: HandoverChoices[K]) => {
    setChoices((c) => ({ ...c, [k]: v }));
    setErrors({});
  };

  const counts: HandoverCounts | null = data?.counts ?? null;
  const nothing = counts && !counts.candidates && !counts.batches && !counts.hostedInterviews && !counts.panelInterviews && !counts.reviews && !counts.apiKeys && !counts.calendar;

  const submit = async () => {
    if (!data) return;
    const check = checkHandover(data.counts, choices, data.people.map((p) => p.userId));
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setBusy(true);
    const res = await removeMemberAction(slug, member.id, choices);
    setBusy(false);
    if (!res.ok) {
      setErrors(res.fieldErrors ?? {});
      notify(res.error, "error");
      return;
    }
    notify(`${displayName(member)} was removed.`);
    onDone();
  };

  const first = displayName(member).split(" ")[0];
  const noPeople = data && data.people.length === 0;
  const ownedLabel = counts
    ? [counts.candidates ? plural(counts.candidates, "candidate") : "", counts.batches ? plural(counts.batches, "hiring batch", "hiring batches") : ""]
        .filter(Boolean)
        .join(" and ")
    : "";
  const goes = counts
    ? [counts.apiKeys ? plural(counts.apiKeys, "API key") : "", counts.calendar ? "calendar" : ""].filter(Boolean).join(" and ")
    : "";

  return (
    <Dialog
      title={`Remove ${displayName(member)}?`}
      onClose={onClose}
      width={600}
      footer={
        <>
          <span className="mr-auto text-[13px] text-muted">Frees a seat. Logged in the audit log.</span>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" disabled={!data || busy || (!!noPeople && !nothing)} onClick={submit}>
            {busy ? "Removing" : nothing ? "Remove" : "Hand over and remove"}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-muted leading-relaxed">
          {first} loses access straight away.
          {data && !nothing && !noPeople ? " Choose who takes over their work so nothing is left without an owner." : " You can invite them again later."}
        </p>

        {loadError && <p className="text-danger">{loadError}</p>}
        {!data && !loadError && <p className="text-muted">Checking what {first} is working on.</p>}

        {data && nothing && <p className="text-fg">{first} has no candidates, upcoming interviews, open take-homes, API keys or calendar to hand over.</p>}

        {data && noPeople && !nothing && (
          <p className="text-warning">There is no one else who can take over their work. Invite a teammate first, or give someone a role above viewer.</p>
        )}

        {data && counts && !nothing && !noPeople && (
          <div className="flex flex-col divide-y divide-border border-y border-border">
            {counts.candidates + counts.batches > 0 && (
              <HandoverRow title={ownedLabel} hint="Pick who owns them from now on." labelFor="handover-owner">
                <PersonSelect id="handover-owner" value={choices.ownerUserId} onChange={(v) => set("ownerUserId", v)} people={data.people} placeholder="Pick a person" error={errors.owner} />
              </HandoverRow>
            )}

            {counts.hostedInterviews > 0 && (
              <HandoverRow
                title={`${plural(counts.hostedInterviews, "upcoming interview")} they host`}
                labelFor="handover-interviewer"
                hint={
                  <>
                    {data.hosted.length > 0 && (
                      <span className="block">
                        {data.hosted
                          .map(
                            (h) =>
                              `${h.candidateName ?? "No candidate yet"}, ${
                                h.scheduledAt ? new Date(h.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "no time"
                              }`,
                          )
                          .join("; ")}
                        {counts.hostedInterviews > data.hosted.length && ` and ${counts.hostedInterviews - data.hosted.length} more`}.
                      </span>
                    )}
                    <span className="block mt-1">
                      {choices.interviewMode === "reassign"
                        ? "Candidates keep the same link and time. Calendar events move to the new host when they have a calendar connected."
                        : "Candidates get an email saying the interview is cancelled."}
                    </span>
                  </>
                }
              >
                <select
                  id="handover-interviewer"
                  value={choices.interviewMode === "cancel" ? CANCEL : (choices.interviewerUserId ?? "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    setChoices((c) =>
                      v === CANCEL ? { ...c, interviewMode: "cancel" } : { ...c, interviewMode: "reassign", interviewerUserId: v || null },
                    );
                    setErrors({});
                  }}
                  aria-invalid={errors.interviewer ? true : undefined}
                  className={`${inputCls} ${errors.interviewer ? "border-danger/60" : ""}`}
                >
                  <option value="">Pick the new interviewer</option>
                  {data.people.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      Give to {p.name}
                      {p.isMe ? " (you)" : ""}
                    </option>
                  ))}
                  <option value={CANCEL}>Cancel them and tell the candidates</option>
                </select>
                {errors.interviewer && <span className="text-xs text-danger">{errors.interviewer}</span>}
              </HandoverRow>
            )}

            {counts.hostedInterviews === 0 && counts.panelInterviews > 0 && (
              <HandoverRow
                title={`Their seat on ${plural(counts.panelInterviews, "interview panel")}`}
                hint="Pick who takes the seat, or leave it empty."
                labelFor="handover-panel"
              >
                <PersonSelect
                  id="handover-panel"
                  value={choices.interviewerUserId}
                  onChange={(v) => set("interviewerUserId", v)}
                  people={data.people}
                  placeholder="Leave the seat empty"
                  error={errors.interviewer}
                />
              </HandoverRow>
            )}

            {counts.hostedInterviews > 0 && counts.panelInterviews > 0 && (
              <HandoverRow title={`${plural(counts.panelInterviews, "other interview")} they join`} hint="They come off the panel.">
                <Chip tone="warning">Happens on remove</Chip>
              </HandoverRow>
            )}

            {counts.reviews > 0 && (
              <HandoverRow title={plural(counts.reviews, "open take-home") + " to review"} hint="Pick who makes the decision." labelFor="handover-reviewer">
                <PersonSelect id="handover-reviewer" value={choices.reviewerUserId} onChange={(v) => set("reviewerUserId", v)} people={data.people} placeholder="Pick a person" error={errors.reviewer} />
              </HandoverRow>
            )}

            {goes && (
              <HandoverRow
                title={`Their ${goes}`}
                hint={[counts.apiKeys ? `${counts.apiKeys === 1 ? "The key" : "Keys"} ${first} made ${counts.apiKeys === 1 ? "is" : "are"} revoked.` : "", counts.calendar ? "Their calendar is disconnected." : ""].filter(Boolean).join(" ")}
              >
                <Chip tone="warning">Happens on remove</Chip>
              </HandoverRow>
            )}

            <HandoverRow title="Their notes and scorecards" hint="Stay on each candidate, signed with their name. Past interviews keep their name too.">
              <Chip tone="success">Kept</Chip>
            </HandoverRow>
          </div>
        )}
      </div>
    </Dialog>
  );
}

const CANCEL = "__cancel";

function HandoverRow({ title, hint, labelFor, children }: { title: string; hint?: ReactNode; labelFor?: string; children: ReactNode }) {
  const Title = labelFor ? "label" : "span";
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 py-3.5">
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <Title htmlFor={labelFor} className="text-fg font-medium">
          {title}
        </Title>
        {hint && <span className="text-[13px] text-muted leading-snug">{hint}</span>}
      </div>
      <div className="sm:w-56 shrink-0 flex flex-col gap-1 items-start">{children}</div>
    </div>
  );
}

function Chip({ tone, children }: { tone: "success" | "warning" | "neutral"; children: ReactNode }) {
  const cls = { success: "bg-success/10 text-success", warning: "bg-warning/10 text-warning", neutral: "bg-panel text-muted" }[tone];
  return <span className={`inline-flex items-center h-6 px-2 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>{children}</span>;
}

/* ───────────────────────────── Owners ───────────────────────────── */

export function OwnerDialog({
  slug,
  member,
  mode,
  ownersNeed2fa,
  onClose,
  onDone,
  notify,
}: {
  slug: string;
  member: Person;
  mode: "add" | "transfer";
  ownersNeed2fa: boolean;
  onClose: () => void;
  onDone: () => void;
  notify: Notify;
}) {
  const [busy, setBusy] = useState(false);
  const name = displayName(member);
  const submit = async () => {
    setBusy(true);
    const res = await changeOwnerAction(slug, member.id, mode);
    setBusy(false);
    if (!res.ok) {
      notify(res.error, "error");
      return;
    }
    notify(mode === "transfer" ? `${name} is now ${res.onlyOwner ? "the owner" : "an owner"}. You are an admin.` : `${name} is now an owner.`);
    onDone();
  };
  return (
    <Dialog
      title={mode === "transfer" ? `Transfer ownership to ${name}?` : `Make ${name} an owner?`}
      onClose={onClose}
      width={480}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit} data-autofocus>
            {busy ? "Saving" : mode === "transfer" ? "Transfer ownership" : "Make owner"}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-muted leading-relaxed">
        <p>
          Owners can do everything, including changing the plan, the web address and security settings, and removing other
          owners.
        </p>
        {mode === "transfer" ? (
          <p className="text-fg">
            You become an admin. You keep access to candidates, members and billing, but only an owner can make you an owner again.
          </p>
        ) : (
          <p>You stay an owner too. Having two owners means the workspace is never stuck if one of you leaves.</p>
        )}
        {ownersNeed2fa && member.twoFactor === false && (
          <p className="flex gap-2 text-warning">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
            {name} has not turned on two-factor sign-in. Owners of this workspace must use it, so they will be asked to set it up next time they open the
            workspace.
          </p>
        )}
      </div>
    </Dialog>
  );
}

/* ───────────────────────────── Invite several people ───────────────────────────── */

type InviteRow = { email: string; role: string };

export function BulkInviteDialog({
  slug,
  onClose,
  onDone,
  notify,
  roleColumns,
  memberEmails,
  pendingEmails,
  allowedDomains,
  seatsRemaining,
}: {
  slug: string;
  onClose: () => void;
  onDone: () => void;
  notify: Notify;
  roleColumns: { key: string; label: string; description: string | null }[];
  memberEmails: string[];
  pendingEmails: string[];
  allowedDomains: string[];
  seatsRemaining: number | null;
}) {
  const [text, setText] = useState("");
  const [defaultRole, setDefaultRole] = useState<string>("INTERVIEWER");
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [busy, setBusy] = useState(false);

  const addFromText = () => {
    const parsed = parseInviteList(text);
    if (!parsed.length) return;
    setRows((current) => {
      const have = new Set(current.map((r) => r.email));
      const added = parsed.filter((p) => !have.has(p.email)).map((p) => ({ email: p.email, role: defaultRole }));
      return [...current, ...added].slice(0, MAX_BULK_INVITES);
    });
    setText("");
  };

  const classified = useMemo(
    () => classifyInvites(rows, { memberEmails, pendingEmails, allowedDomains, seatsRemaining }),
    [rows, memberEmails, pendingEmails, allowedDomains, seatsRemaining],
  );
  const ready = sendableInvites(classified);
  const pendingText = parseInviteList(text).length;

  const submit = async () => {
    if (!ready.length) return;
    setBusy(true);
    const res = await bulkInviteAction(
      slug,
      ready.map((r) => ({ email: r.email, role: r.role })),
    );
    setBusy(false);
    if (!res.ok) {
      notify(res.error, "error");
      return;
    }
    const skipped = res.skipped.length;
    notify(
      res.sent.length === 1 ? `Invite sent to ${res.sent[0].email}.` : `${plural(res.sent.length, "invite")} sent.${skipped ? ` ${skipped} could not be sent.` : ""}`,
      res.sent.length ? "ok" : "error",
    );
    if (res.sent.length) onDone();
  };

  const description = roleColumns.find((r) => r.key === defaultRole)?.description;

  return (
    <Dialog
      title="Invite people"
      onClose={onClose}
      width={660}
      footer={
        <>
          <span className="mr-auto text-[13px] text-muted">
            {rows.length ? `${plural(ready.length, "invite")} ready${classified.length > ready.length ? `, ${classified.length - ready.length} with a problem` : ""}` : ""}
          </span>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={busy || !ready.length} onClick={submit}>
            {busy ? "Sending" : ready.length > 1 ? `Send ${ready.length} invites` : "Send invite"}
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="bulk-invite-emails" className="text-sm text-muted">
            Paste one address or a whole list from a spreadsheet or email. Commas and new lines both work.
          </label>
          <textarea
            id="bulk-invite-emails"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                addFromText();
              }
            }}
            rows={3}
            placeholder="ana@company.com, bo@company.com"
            className={`${inputCls} h-auto py-2.5 resize-y font-mono leading-relaxed`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-2.5 gap-y-2">
            <label htmlFor="bulk-invite-role" className="text-[13px] text-muted">
              Invite as
            </label>
            <select
              id="bulk-invite-role"
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value)}
              className={`${fixedInputCls} w-40`}
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
            <span className="text-[13px] text-muted whitespace-nowrap">or change one at a time below.</span>
            <Btn size="md" disabled={!pendingText} onClick={addFromText} className="ml-auto">
              {pendingText > 1 ? `Add ${pendingText} people` : "Add to list"}
            </Btn>
          </div>
          {description && <p className="text-xs text-subtle">{description}</p>}
        </div>

        {classified.length > 0 && (
          <ul className="divide-y divide-border border-y border-border max-h-72 overflow-y-auto">
            {classified.map((r, i) => {
              const locked = !!r.issue && r.issue !== "seats";
              return (
                <li key={`${r.email}-${i}`} className="flex items-center gap-3 py-2.5">
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span title={r.email} className={`text-sm truncate ${r.issue ? "text-muted" : "text-fg"}`}>{r.email}</span>
                    {!r.issue && r.reinvite && <span className="text-xs text-subtle">Has an open invite. Sending replaces it.</span>}
                  </span>
                  {locked ? (
                    <span className="w-36 shrink-0 px-3 text-[13px] text-muted">{roleLabel(rows[i].role)}</span>
                  ) : (
                    <label className="contents">
                      <span className="sr-only">Role for {r.email}</span>
                      <select
                        value={rows[i].role}
                        onChange={(e) => setRows((all) => all.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                        className={`${fixedInputCls} w-36 shrink-0`}
                      >
                        {INVITABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <span className="w-36 shrink-0 flex">
                    {r.issue ? (
                      <Chip tone={r.issue === "member" || r.issue === "duplicate" ? "neutral" : "warning"}>{INVITE_ISSUE_LABELS[r.issue]}</Chip>
                    ) : (
                      <Chip tone="success">Ready</Chip>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRows((all) => all.filter((_, j) => j !== i))}
                    aria-label={`Remove ${r.email} from the list`}
                    className="shrink-0 w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted hover:text-fg hover:bg-panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-[13px] text-muted">
          Each person gets an email with a link that works for {INVITE_TTL_DAYS} days.
          {allowedDomains.length > 0 && ` Invites are limited to ${allowedDomains.join(", ")}.`}
          {seatsRemaining !== null && ` ${plural(seatsRemaining, "seat")} left.`} To make someone an owner, invite them first and use Make
          owner once they join.
        </p>
      </div>
    </Dialog>
  );
}

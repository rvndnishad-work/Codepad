"use client";

/**
 * Open alerts from the hourly rule-based scan (GemmaAlert), with the action
 * each one proposes. Approving runs the audited server action in
 * ../copilot/actions.ts; nothing runs without a click.
 */
import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  approveBlogPostAction,
  archiveSessionAction,
  banUserAction,
  bulkArchiveStalledSessionsAction,
  createTodoFromAlertAction,
  deleteCommentAction,
  dismissAlertAction,
  featureBlogPostAction,
  publishChallengeAction,
  setTodoStatusAction,
  unbanUserAction,
  unfeatureBlogPostAction,
  unpublishChallengeAction,
} from "../copilot/actions";
import { btn, btnPrimary, pill } from "./ProposalCard";

export type AlertItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: string;
  createdAt: string;
  proposedAction: { actionType: string; targetId: string; meta?: Record<string, unknown> } | null;
};

const ACTION_LABEL: Record<string, string> = {
  BAN_USER: "Suspend user",
  UNBAN_USER: "Lift suspension",
  ARCHIVE_SESSION: "Archive session",
  BULK_ARCHIVE_SESSIONS: "Archive stalled sessions",
  MODERATE_BLOG: "Publish post",
  FEATURE_BLOG: "Feature post",
  UNFEATURE_BLOG: "Unfeature post",
  DELETE_COMMENT: "Delete comment",
  PUBLISH_CHALLENGE: "Publish challenge",
  UNPUBLISH_CHALLENGE: "Unpublish challenge",
  UPDATE_TODO_STATUS: "Move ticket",
  CREATE_TODO: "Add ticket",
};

/** Actions that change or remove something for a person need a second click. */
const CONFIRM = new Set(["BAN_USER", "DELETE_COMMENT", "BULK_ARCHIVE_SESSIONS", "UNPUBLISH_CHALLENGE"]);

async function runAlertAction(a: AlertItem) {
  const p = a.proposedAction!;
  const m = p.meta ?? {};
  switch (p.actionType) {
    case "BAN_USER": return banUserAction(p.targetId, a.id);
    case "UNBAN_USER": return unbanUserAction(p.targetId, a.id);
    case "ARCHIVE_SESSION": return archiveSessionAction(p.targetId, a.id);
    case "BULK_ARCHIVE_SESSIONS": return bulkArchiveStalledSessionsAction(a.id);
    case "MODERATE_BLOG": return approveBlogPostAction(p.targetId, a.id);
    case "FEATURE_BLOG": return featureBlogPostAction(p.targetId, a.id);
    case "UNFEATURE_BLOG": return unfeatureBlogPostAction(p.targetId, a.id);
    case "DELETE_COMMENT": return deleteCommentAction(p.targetId, a.id);
    case "PUBLISH_CHALLENGE": return publishChallengeAction(p.targetId, a.id);
    case "UNPUBLISH_CHALLENGE": return unpublishChallengeAction(p.targetId, a.id);
    case "UPDATE_TODO_STATUS": return setTodoStatusAction(p.targetId, String(m.newStatus ?? "TODO"), a.id);
    case "CREATE_TODO": {
      const priority = m.priority === "LOW" || m.priority === "MEDIUM" ? m.priority : "HIGH";
      return createTodoFromAlertAction(String(m.title ?? a.title), String(m.body ?? a.body), priority, String(m.category ?? ""), a.id);
    }
    default:
      throw new Error("This alert has no action the console can run.");
  }
}

const SEVERITY_PILL: Record<string, string> = { CRITICAL: pill.bad, HIGH: pill.bad, MEDIUM: pill.warn, LOW: pill.off };

export default function AlertsPanel({ initial }: { initial: AlertItem[] }) {
  const [alerts, setAlerts] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; text: string } | null>(null);

  async function act(a: AlertItem, kind: "run" | "dismiss") {
    setBusy(a.id + kind);
    setError(null);
    try {
      if (kind === "run") await runAlertAction(a);
      else await dismissAlertAction(a.id);
      setAlerts((list) => list.filter((x) => x.id !== a.id));
    } catch (err) {
      setError({ id: a.id, text: (err as Error).message || "The action failed." });
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  if (alerts.length === 0) return <p className="text-sm text-muted px-1 py-2">No open alerts.</p>;

  return (
    <ul className="flex flex-col divide-y divide-border">
      {alerts.map((a) => {
        const label = a.proposedAction ? ACTION_LABEL[a.proposedAction.actionType] : null;
        const blogId = a.proposedAction?.actionType === "MODERATE_BLOG" ? a.proposedAction.targetId : null;
        return (
          <li key={a.id} className="py-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center h-6 px-2 rounded-full text-xs font-medium ${SEVERITY_PILL[a.severity] ?? pill.off}`}>
                {a.severity.charAt(0) + a.severity.slice(1).toLowerCase()}
              </span>
              <span className="text-sm font-medium text-fg">{a.title}</span>
              <span className="text-xs text-subtle ml-auto">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted line-clamp-3 whitespace-pre-wrap">{a.body}</p>
            {error?.id === a.id && <p className="text-sm text-danger">{error.text}</p>}
            <div className="flex gap-2 justify-end flex-wrap">
              {blogId && (
                <Link className={btn} href={`/admin/blogs?status=PENDING`}>
                  Open blogs
                </Link>
              )}
              <button type="button" className={btn} disabled={!!busy} onClick={() => act(a, "dismiss")}>
                {busy === a.id + "dismiss" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Dismiss
              </button>
              {label &&
                (CONFIRM.has(a.proposedAction!.actionType) && confirm !== a.id ? (
                  <button type="button" className={btn} disabled={!!busy} onClick={() => setConfirm(a.id)}>
                    {label}
                  </button>
                ) : (
                  <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => act(a, "run")}>
                    {busy === a.id + "run" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {CONFIRM.has(a.proposedAction!.actionType) ? `Confirm: ${label.toLowerCase()}` : label}
                  </button>
                ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

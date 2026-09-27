"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Link2 } from "lucide-react";
import { Btn, Dialog, fmtDate } from "../../../candidates/_components/ui";
import { SHARE_LINK_DAYS } from "@/lib/ai-interview/report-extras";
import { createShareLinkAction, listShareLinksAction, revokeShareLinkAction, type ShareLinkRow } from "../../report-actions";

/**
 * Read-only share links for one report. A hiring manager opens the link
 * without an account; it expires after a week and can be revoked here.
 */
export default function ShareDialog({
  slug,
  sessionId,
  firstName,
  finished,
  onClose,
  toast,
}: {
  slug: string;
  sessionId: string;
  firstName: string;
  finished: boolean;
  onClose: () => void;
  toast: (text: string, tone?: "ok" | "error") => void;
}) {
  const [links, setLinks] = useState<ShareLinkRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    listShareLinksAction(slug, sessionId).then((res) => {
      if (!live) return;
      if (res.ok) setLinks(res.links);
      else setError(res.error);
    });
    return () => {
      live = false;
    };
  }, [slug, sessionId]);

  const copy = (url: string) =>
    navigator.clipboard?.writeText(url).then(
      () => toast("Read-only link copied"),
      () => toast("Could not copy the link", "error"),
    );

  const create = () =>
    start(async () => {
      const res = await createShareLinkAction(slug, sessionId);
      if (!res.ok) return toast(res.error, "error");
      setLinks((l) => [res.link, ...(l ?? [])]);
      if (res.link.url) copy(res.link.url);
    });

  const revoke = (id: string) =>
    start(async () => {
      const res = await revokeShareLinkAction(slug, id);
      if (!res.ok) return toast(res.error, "error");
      setLinks((l) => (l ?? []).map((x) => (x.id === id ? { ...x, state: "revoked", url: null } : x)));
      toast("Link revoked. It stops working straight away.");
    });

  const active = (links ?? []).filter((l) => l.state === "active");
  const past = (links ?? []).filter((l) => l.state !== "active");

  return (
    <Dialog
      title="Share a read-only link"
      onClose={onClose}
      width={560}
      footer={
        <>
          <Btn onClick={onClose}>Close</Btn>
          <Btn variant="primary" icon={Link2} disabled={pending || !finished} onClick={create}>
            Create link
          </Btn>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted leading-relaxed">
          Anyone with the link can read {firstName}&apos;s report without signing in: the score, summary, tests, code and transcript. It
          never shows reference answers or team notes, and nobody can pass or fail from it. Each link expires after {SHARE_LINK_DAYS} days.
        </p>
        {!finished && <p className="text-sm text-fg">You can share the report once {firstName} has finished.</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {links === null && !error && <div className="h-16 rounded-lg bg-panel animate-pulse" />}
        {links && links.length === 0 && finished && <p className="text-sm text-subtle">No links yet.</p>}
        {active.length > 0 && (
          <ul className="flex flex-col gap-2">
            {active.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg px-3 py-2.5">
                <div className="flex-1 min-w-[200px] flex flex-col gap-0.5">
                  <span className="text-[13px] text-fg">
                    Expires {fmtDate(l.expiresAt)}, created by {l.createdBy}
                  </span>
                  <span className="text-xs text-subtle">
                    {l.viewCount === 0 ? "Not opened yet" : `Opened ${l.viewCount} ${l.viewCount === 1 ? "time" : "times"}, last ${fmtDate(l.lastViewedAt)}`}
                  </span>
                </div>
                {l.url && (
                  <Btn icon={Copy} onClick={() => copy(l.url!)}>
                    Copy
                  </Btn>
                )}
                <Btn variant="quiet" disabled={pending} onClick={() => revoke(l.id)} className="text-danger hover:text-danger">
                  Revoke
                </Btn>
              </li>
            ))}
          </ul>
        )}
        {past.length > 0 && (
          <details className="text-[13px]">
            <summary className="cursor-pointer text-muted hover:text-fg">
              {past.length} expired or revoked {past.length === 1 ? "link" : "links"}
            </summary>
            <ul className="mt-2 flex flex-col gap-1 text-subtle">
              {past.map((l) => (
                <li key={l.id}>
                  {l.state === "revoked" ? "Revoked" : "Expired"}, created {fmtDate(l.createdAt)} by {l.createdBy}
                  {l.viewCount > 0 ? `, opened ${l.viewCount} ${l.viewCount === 1 ? "time" : "times"}` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Dialog>
  );
}

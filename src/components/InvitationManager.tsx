"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Mail,
  MessageCircle,
  Plus,
  XCircle,
} from "lucide-react";

type Invitation = {
  id: string;
  email: string;
  token: string;
  status: string;
  acceptedAt: string | null;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null } | null;
};

/**
 * Shared invitation panel — works for both Tracks and Challenges. The
 * caller passes:
 *   - `listEndpoint`: GET/POST URL returning { invitations: [...] }
 *   - `revokeEndpoint`: function building the DELETE URL for a given id
 *   - `linkBase`: prefix the magic link is built under (e.g. "/challenges/foo")
 *     — the manager appends "?invite=<token>" to form the share URL.
 *
 * The component is intentionally generic so introducing a third invitable
 * surface later doesn't require a third manager.
 */
export default function InvitationManager({
  listEndpoint,
  revokeEndpoint,
  linkBase,
  emptyState = "No invitations yet.",
  description = "Add emails below to generate share links. Send the link via email or WhatsApp — recipients sign in (or sign up) and the magic link grants them access.",
}: {
  listEndpoint: string;
  revokeEndpoint: (inviteId: string) => string;
  linkBase: string;
  emptyState?: string;
  description?: string;
}) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(listEndpoint, { cache: "no-store" });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as { invitations: Invitation[] };
        if (!cancelled) setInvitations(data.invitations);
      } catch {
        if (!cancelled) toast.error("Couldn't load invitations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listEndpoint]);

  async function addInvites() {
    const emails = emailInput
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast.error("Enter at least one email");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(listEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? `Status ${res.status}`);
      }
      const data = (await res.json()) as { invitations: Invitation[] };
      setInvitations(data.invitations);
      setEmailInput("");
      toast.success(`Invited ${emails.length} ${emails.length === 1 ? "person" : "people"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(inviteId: string) {
    if (!confirm("Revoke this invitation? The magic link will stop working.")) return;
    const snapshot = invitations;
    setInvitations((prev) =>
      prev.map((i) => (i.id === inviteId ? { ...i, status: "revoked" } : i))
    );
    try {
      const res = await fetch(revokeEndpoint(inviteId), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invitation revoked");
    } catch {
      setInvitations(snapshot);
      toast.error("Couldn't revoke");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-2">
        Invitations
      </div>
      <p className="text-[11px] text-muted/70 leading-relaxed mb-3">
        {description}
      </p>

      <div className="flex flex-col gap-2 mb-3">
        <textarea
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          rows={2}
          placeholder="alice@example.com, bob@example.com"
          className="w-full bg-bg/40 border border-border rounded-md px-2 py-1.5 text-xs text-fg placeholder:text-muted/40 focus:outline-none focus:border-border-strong resize-y"
        />
        <button
          type="button"
          onClick={addInvites}
          disabled={busy || !emailInput.trim()}
          className="self-end inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg text-xs font-black hover:bg-accent-soft transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Invite
        </button>
      </div>

      {loading ? (
        <div className="text-[11px] text-muted/60 italic py-2 text-center">
          Loading…
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-[11px] text-muted/60 italic py-2 text-center border border-dashed border-border rounded-md">
          {emptyState}
        </div>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {invitations.map((inv) => (
            <li key={inv.id}>
              <InviteRow
                invitation={inv}
                linkBase={linkBase}
                onRevoke={revoke}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InviteRow({
  invitation,
  linkBase,
  onRevoke,
}: {
  invitation: Invitation;
  linkBase: string;
  onRevoke: (id: string) => void;
}) {
  // Build the magic link relative to the current host so it works in both
  // dev and prod without hard-coded URLs.
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}${linkBase}?invite=${invitation.token}`
      : `${linkBase}?invite=${invitation.token}`;

  const subject = encodeURIComponent(`You're invited to a coding challenge`);
  const body = encodeURIComponent(
    `Hi,\n\nI'd like to invite you to a coding challenge on Interviewpad. Open the link below to get started:\n\n${link}\n\n— sent from Interviewpad`
  );
  const mailHref = `mailto:${invitation.email}?subject=${subject}&body=${body}`;
  const waText = encodeURIComponent(
    `Hey — I'd like to invite you to a coding challenge on Interviewpad: ${link}`
  );
  const waHref = `https://wa.me/?text=${waText}`;

  const tone =
    invitation.status === "accepted"
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
      : invitation.status === "revoked"
      ? "text-muted/60 bg-muted/10 border-border"
      : "text-amber-500 bg-amber-500/10 border-amber-500/30";

  const revoked = invitation.status === "revoked";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 p-2.5 rounded-lg border bg-elevated/30 ${
        revoked ? "opacity-50" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs font-mono text-fg truncate" title={invitation.email}>
          {invitation.email}
        </span>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${tone}`}
        >
          {invitation.status}
        </span>
      </div>
      {!revoked && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-bg/60 border border-border text-[10px] font-bold text-fg hover:border-border-strong transition"
            title="Copy magic link"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
          <a
            href={mailHref}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-bg/60 border border-border text-[10px] font-bold text-fg hover:border-border-strong transition"
            title="Send via email"
          >
            <Mail className="w-3 h-3" />
            Email
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-500 hover:bg-emerald-500/20 transition"
            title="Share via WhatsApp"
          >
            <MessageCircle className="w-3 h-3" />
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => onRevoke(invitation.id)}
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition"
            title="Revoke"
          >
            <XCircle className="w-3 h-3" />
            Revoke
          </button>
        </div>
      )}
    </div>
  );
}

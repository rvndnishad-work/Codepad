"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CandidateAtsCard } from "@/lib/ats/connection-server";
import { sendWaitingInviteAction } from "../../connections/actions";
import { formatWhen } from "../../connections/ui";

const NAMES: Record<string, string> = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby" };
export const atsName = (p: string) => NAMES[p] ?? "your ATS";

const TONE: Record<string, string> = {
  imported: "text-success",
  linked: "text-muted",
  waiting: "text-warning",
  sent: "text-success",
  failed: "text-danger",
  info: "text-muted",
};

function importedWhen(iso: string): string {
  const t = formatWhen(iso);
  return /^\d/.test(t) ? `Today, ${t}` : t;
}

/** "From Greenhouse" side card: what came in, what went back, what goes next. */
export default function AtsSourceCard({ slug, candidateName, card, canSend }: { slug: string; candidateName: string; card: CandidateAtsCard; canSend: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const name = atsName(card.provider);
  const first = candidateName.split(" ")[0] || candidateName;

  const send = (id: string) =>
    start(async () => {
      const r = await sendWaitingInviteAction(slug, id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Invite sent");
      router.refresh();
    });

  const rows: [string, React.ReactNode][] = [
    ["Job", card.job ?? "Not given"],
    ["Screening", card.screening],
    ["Imported", importedWhen(card.importedAt)],
    ["Sent back", card.sentBack],
  ];

  return (
    <section className="rounded-xl border border-border bg-surface px-5 py-[18px] flex flex-col gap-2.5" aria-labelledby="ats-card-title">
      <div className="flex justify-between items-center gap-2">
        <h2 id="ats-card-title" className="text-[13px] font-semibold text-muted">
          {name}
        </h2>
        {card.profileUrl && (
          <a href={card.profileUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] text-secondary hover:underline">
            Open in {name}
          </a>
        )}
      </div>
      <dl className="flex flex-col">
        {rows.map(([k, v], i) => (
          <div key={k} className={`flex justify-between gap-3 py-2 text-sm ${i ? "border-t border-border" : ""}`}>
            <dt className="text-muted">{k}</dt>
            <dd className="text-fg text-right">{v}</dd>
          </div>
        ))}
        {card.nextToSend && (
          <div className="flex justify-between gap-3 py-2 text-sm border-t border-border">
            <dt className="text-muted">Next to send</dt>
            <dd className="text-warning text-right">{card.nextToSend}</dd>
          </div>
        )}
      </dl>
      {card.waitingRequestId && canSend && (
        <button
          type="button"
          onClick={() => send(card.waitingRequestId!)}
          disabled={busy}
          className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 transition disabled:opacity-50"
        >
          Send the {card.screening}
        </button>
      )}
      <p className="text-[13px] text-muted leading-relaxed">
        When you pass or do not pass {first}, {name} gets the result and a link to this profile.
      </p>
      {card.log.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[13px] text-secondary hover:underline list-none">Sync log ({card.log.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {card.log.map((e) => (
              <li key={e.id} className="text-[13px] leading-snug">
                <span className="font-mono text-subtle mr-2">{formatWhen(e.createdAt)}</span>
                <span className={TONE[e.status] ?? "text-muted"}>{e.direction === "in" ? "In" : "Out"}:</span> <span className="text-fg">{e.summary}</span>
                {e.detail && e.status === "failed" && !e.resolved && <span className="block text-danger">{e.detail}</span>}
              </li>
            ))}
          </ul>
          <Link href={`/w/${slug}/connections/ats`} className="mt-2 inline-block text-[13px] text-secondary hover:underline">
            Full sync log
          </Link>
        </details>
      )}
    </section>
  );
}

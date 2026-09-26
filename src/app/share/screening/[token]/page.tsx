import { Link2Off } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { loadReport } from "@/lib/ai-interview/console-server";
import { verifyShareToken } from "@/lib/ai-interview/report-share";
import { toSharedReport } from "@/lib/ai-interview/report-share-view";
import SharedReportView from "./SharedReportView";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Screening report — Interviewpad",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const COPY = {
  invalid: { title: "This link does not work", body: "It may have been copied only in part. Ask the person who shared it to send it again." },
  expired: { title: "This link has expired", body: "Shared reports stay open for a week. Ask the person who shared it for a new link." },
  revoked: { title: "This link was turned off", body: "The person who shared the report revoked it. Ask them for a new link if you still need it." },
} as const;

function Closed({ reason }: { reason: keyof typeof COPY }) {
  const c = COPY[reason];
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center flex flex-col items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-panel text-muted flex items-center justify-center">
          <Link2Off className="w-5 h-5" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold text-fg">{c.title}</h1>
        <p className="text-sm text-muted leading-relaxed">{c.body}</p>
      </div>
    </div>
  );
}

/**
 * A screening report opened from a read-only share link. No sign-in: the
 * signed token is the key. The row is checked on every view, so a revoked
 * link stops working at once. Only the fields in SharedReport reach the page.
 */
export default async function SharedScreeningReportPage({ params }: Props) {
  const { token } = await params;
  let check: ReturnType<typeof verifyShareToken>;
  try {
    check = verifyShareToken(decodeURIComponent(token));
  } catch {
    return <Closed reason="invalid" />;
  }
  if (!check.ok) return <Closed reason={check.reason === "expired" ? "expired" : "invalid"} />;

  const link = await prisma.aIReportShareLink.findUnique({ where: { id: check.linkId } });
  if (!link) return <Closed reason="invalid" />;
  if (link.revokedAt) return <Closed reason="revoked" />;
  if (link.expiresAt.getTime() <= Date.now()) return <Closed reason="expired" />;

  const report = await loadReport(link.workspaceId, link.sessionId, "");
  if (!report || report.status !== "COMPLETED") return <Closed reason="invalid" />;

  const [workspace] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: link.workspaceId }, select: { name: true } }),
    prisma.aIReportShareLink
      .update({ where: { id: link.id }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } })
      .catch(() => null),
  ]);

  return <SharedReportView r={toSharedReport(report)} sharedBy={workspace?.name ?? "the hiring team"} expiresAt={link.expiresAt.toISOString()} />;
}

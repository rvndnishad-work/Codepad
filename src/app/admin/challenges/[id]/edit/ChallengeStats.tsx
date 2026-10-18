import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { formatDuration, pct, stepFunnel, type StepInfo } from "../../../content/_lib/challenge-stats";

/**
 * Pass rate, average duration and per-step drop-off for one challenge, from
 * aggregate queries only. Drop-off counts distinct people per step.
 */
export default async function ChallengeStats({ challengeId, steps }: { challengeId: string; steps: StepInfo[] }) {
  const [byStatus, durations, perStep, takeHomes] = await Promise.all([
    prisma.challengeAttempt.groupBy({ by: ["status"], where: { challengeId }, _count: { _all: true } }),
    prisma.challengeAttempt.aggregate({
      where: { challengeId, status: { in: ["passed", "failed"] }, durationSec: { not: null } },
      _avg: { durationSec: true },
    }),
    prisma.$queryRaw<{ stepId: string; started: bigint; passed: bigint }[]>(Prisma.sql`
      SELECT "stepId",
             COUNT(DISTINCT "userId") AS started,
             COUNT(DISTINCT "userId") FILTER (WHERE "status" = 'passed') AS passed
      FROM "ChallengeAttempt"
      WHERE "challengeId" = ${challengeId} AND "stepId" IS NOT NULL
      GROUP BY "stepId"`),
    prisma.takeHomeAssignment.count({ where: { challengeId } }),
  ]);

  const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const total = byStatus.reduce((n, b) => n + b._count._all, 0);
  const passed = count("passed");
  const finished = passed + count("failed");
  const funnel = stepFunnel(
    steps,
    perStep.map((r) => ({ stepId: r.stepId, started: Number(r.started), passed: Number(r.passed) })),
  );

  const tiles = [
    { label: "Attempts", value: total.toLocaleString(), sub: `${count("in_progress")} in progress` },
    { label: "Pass rate", value: pct(finished ? passed / finished : null), sub: `${passed} of ${finished} finished` },
    { label: "Average time", value: formatDuration(durations._avg.durationSec), sub: "finished attempts" },
    { label: "Take-homes", value: takeHomes.toLocaleString(), sub: "sent from workspaces" },
  ];

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-fg">How people do on it</h3>
        <Link href={`/admin/attempts?challenge=${challengeId}`} className="text-sm text-muted hover:text-fg">
          See attempts
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
        {tiles.map((t) => (
          <div key={t.label} className="px-4 py-3">
            <div className="text-xs text-muted">{t.label}</div>
            <div className="text-xl font-semibold tabular-nums text-fg mt-0.5">{t.value}</div>
            <div className="text-xs text-subtle mt-0.5">{t.sub}</div>
          </div>
        ))}
      </div>
      {funnel.length > 1 && (
        <table className="w-full text-sm border-t border-border">
          <thead className="bg-panel text-xs text-muted">
            <tr>
              <th className="text-left font-medium px-4 py-2">Step</th>
              <th className="text-right font-medium px-4 py-2">People started</th>
              <th className="text-right font-medium px-4 py-2">Passed</th>
              <th className="text-right font-medium px-4 py-2">Did not go on</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {funnel.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-fg">{r.label}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.started}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {r.passed} <span className="text-subtle">({pct(r.passRate)})</span>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{pct(r.dropOff)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

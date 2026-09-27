/**
 * Database side of Billing and usage: the credit history page and CSV, and
 * the six-month usage numbers.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { ledgerViews, usageByMonth, usageMonths, type LedgerView, type UsageMonth } from "./usage";

export const LEDGER_PAGE_SIZE = 25;
/** Most rows in one CSV export. */
export const LEDGER_EXPORT_MAX = 10_000;

const LEDGER_SELECT = {
  id: true,
  kind: true,
  amount: true,
  createdAt: true,
  note: true,
  session: { select: { candidateName: true } },
} as const;

type LedgerRecord = { id: string; kind: string; amount: number; createdAt: Date; note: string | null; session: { candidateName: string } | null };

const toRow = (r: LedgerRecord) => ({ id: r.id, kind: r.kind, amount: r.amount, createdAt: r.createdAt, note: r.note, candidateName: r.session?.candidateName ?? null });

/** One page of credit history, newest first, with the balance after each row. */
export async function loadLedgerPage(
  workspaceId: string,
  page: number,
  size = LEDGER_PAGE_SIZE,
): Promise<{ rows: LedgerView[]; total: number; page: number; pages: number; balance: number }> {
  const [total, sum] = await Promise.all([
    prisma.aIInterviewCreditLedger.count({ where: { workspaceId } }),
    prisma.aIInterviewCreditLedger.aggregate({ where: { workspaceId }, _sum: { amount: true } }),
  ]);
  const balance = sum._sum.amount ?? 0;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const skip = (current - 1) * size;
  const [records, newer] = await Promise.all([
    prisma.aIInterviewCreditLedger.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: size,
      select: LEDGER_SELECT,
    }),
    // Rows on earlier pages, so the balance column starts from the right number.
    skip > 0
      ? prisma.aIInterviewCreditLedger.findMany({
          where: { workspaceId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: skip,
          select: { amount: true },
        })
      : Promise.resolve([] as { amount: number }[]),
  ]);
  const newerSum = newer.reduce((n, r) => n + r.amount, 0);
  return { rows: ledgerViews(records.map(toRow), balance, newerSum), total, page: current, pages, balance };
}

/** The whole credit history for the CSV export, newest first. */
export async function loadLedgerForExport(workspaceId: string): Promise<LedgerView[]> {
  const [records, sum] = await Promise.all([
    prisma.aIInterviewCreditLedger.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: LEDGER_EXPORT_MAX,
      select: LEDGER_SELECT,
    }),
    prisma.aIInterviewCreditLedger.aggregate({ where: { workspaceId }, _sum: { amount: true } }),
  ]);
  return ledgerViews(records.map(toRow), sum._sum.amount ?? 0);
}

/** Take-homes, AI screenings, interviews and credits for each of the last six months. */
export async function loadUsageMonths(workspaceId: string, now: Date = new Date()): Promise<UsageMonth[]> {
  const months = usageMonths(now);
  const since = months[0].start;
  const created = { gte: since };
  const [sessions, legacy, screenings, ledger] = await Promise.all([
    prisma.interviewSession.findMany({ where: { workspaceId, createdAt: created }, select: { type: true, createdAt: true } }),
    prisma.takeHomeAssignment.findMany({ where: { workspaceId, createdAt: created }, select: { createdAt: true } }),
    prisma.aIInterviewSession.findMany({ where: { workspaceId, practice: false, createdAt: created }, select: { createdAt: true } }),
    prisma.aIInterviewCreditLedger.findMany({ where: { workspaceId, createdAt: created }, select: { kind: true, amount: true, createdAt: true } }),
  ]);
  return usageByMonth(months, {
    takeHomes: [...sessions.filter((s) => s.type === "take-home").map((s) => s.createdAt), ...legacy.map((l) => l.createdAt)],
    aiScreenings: screenings.map((s) => s.createdAt),
    interviews: sessions.filter((s) => s.type !== "take-home").map((s) => s.createdAt),
    ledger,
  });
}

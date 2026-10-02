/**
 * The credit ledger filters, shared by the page and the CSV export so the
 * export always holds exactly what the table shows.
 */
import type { Prisma } from "@prisma/client";
import { dayParam, dayRange, one, pick, type SearchParams } from "../interviews/_components/params";
import { LEDGER_KINDS } from "./credits-math";

export type LedgerFilters = { ws: string; kind: string; from: string; to: string };

export function parseLedgerFilters(sp: SearchParams): LedgerFilters {
  return {
    ws: one(sp.ws).slice(0, 80),
    kind: pick(one(sp.kind), LEDGER_KINDS),
    from: dayParam(one(sp.from)),
    to: dayParam(one(sp.to)),
  };
}

export function ledgerWhere(f: LedgerFilters): Prisma.AIInterviewCreditLedgerWhereInput {
  const and: Prisma.AIInterviewCreditLedgerWhereInput[] = [];
  if (f.ws) {
    and.push({
      OR: [
        { workspaceId: f.ws },
        { workspace: { is: { OR: [{ name: { contains: f.ws, mode: "insensitive" } }, { slug: { contains: f.ws.toLowerCase() } }] } } },
      ],
    });
  }
  if (f.kind) and.push({ kind: f.kind });
  const created = dayRange(f.from, f.to);
  if (created) and.push({ createdAt: created });
  return and.length ? { AND: and } : {};
}

/** Most rows in one CSV export. */
export const LEDGER_EXPORT_MAX = 10_000;

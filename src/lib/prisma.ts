import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Neon's current connection strings include `channel_binding=require`. SCRAM
 * channel binding can't work through Neon's *pooled* (PgBouncer) endpoint —
 * TLS terminates at the proxy, not at Postgres — so a pooled `DATABASE_URL`
 * carrying that flag fails at connect time with a misleading
 * "Can't reach database server" error. The *direct* endpoint terminates TLS at
 * Postgres, so it's unaffected, which is why `prisma migrate` (DIRECT_URL)
 * succeeds while runtime pooled queries crash.
 *
 * We strip the flag defensively so a freshly copy-pasted Neon pooled URL works
 * without hand-editing. TLS itself is untouched (`sslmode=require` stays).
 */
function stripChannelBinding(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    if (!u.searchParams.has("channel_binding")) return raw;
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return raw;
  }
}

const url = stripChannelBinding(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
const SCOPED_OPERATIONS = [
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "updateMany",
  "deleteMany",
  "aggregate",
  "groupBy",
];

function applyWorkspaceScope(workspaceId: string) {
  return async ({ operation, args, query }: { operation: string; args: any; query: (args: any) => Promise<any> }) => {
    if (SCOPED_OPERATIONS.includes(operation)) {
      args = args ?? {};
      args.where = { ...(args.where ?? {}), workspaceId };
    }
    return query(args);
  };
}

/**
 * Returns a Prisma Client instance extended with automatic tenant scoping
 * for workspace-isolated models (Candidate, InterviewSession, TakeHomeAssignment,
 * AIInterviewSession, WorkspaceAuditLog).
 */
export function forWorkspace(workspaceId: string) {
  const scope = applyWorkspaceScope(workspaceId);
  return prisma.$extends({
    query: {
      candidate: {
        $allOperations: scope,
      },
      interviewSession: {
        $allOperations: scope,
      },
      takeHomeAssignment: {
        $allOperations: scope,
      },
      aIInterviewSession: {
        $allOperations: scope,
      },
      workspaceAuditLog: {
        $allOperations: scope,
      },
    },
  });
}


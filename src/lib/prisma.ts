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

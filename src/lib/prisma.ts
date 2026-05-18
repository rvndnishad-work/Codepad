import { PrismaClient } from "@prisma/client";

// Reset global PrismaClient instance in development to pick up newly pushed migrations
if (process.env.NODE_ENV !== "production") {
  delete (globalThis as any).prisma;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

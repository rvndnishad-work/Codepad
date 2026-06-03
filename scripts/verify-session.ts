// Throwaway: mints a session for the admin user and prints the cookie.
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
const prisma = new PrismaClient();
async function main() {
  const email = "rvndnishad@gmail.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("admin user not found — seed one with email " + email);
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });
  // Find any existing workspace too so we don't have to query again
  const ws = await prisma.workspace.findFirst({ select: { id: true, name: true, slug: true } });
  console.log("USER_ID=" + user.id);
  console.log("SESSION_TOKEN=" + sessionToken);
  console.log("WORKSPACE_ID=" + (ws?.id ?? "NONE"));
  console.log("WORKSPACE_NAME=" + (ws?.name ?? ""));
}
main().finally(() => prisma.$disconnect());

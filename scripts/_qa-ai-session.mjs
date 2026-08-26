import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 1) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (!(k in process.env)) process.env[k] = v;
}

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.aIInterviewSession.count();
  const recent = await prisma.aIInterviewSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      inviteToken: true,
      status: true,
      practice: true,
      positionTitle: true,
      templateId: true,
      candidateName: true,
      startedAt: true,
    },
  });
  console.log(JSON.stringify({ count, recent }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

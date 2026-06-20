/**
 * Load Gemini-generated machine-coding tutorials (prisma/data/generated/mc/*.json)
 * into PrepQuestion.frameworksData. Lints each framework bundle and only keeps
 * the ones that pass (so a broken Angular bundle, say, is dropped rather than
 * shipped). Mirrors the React (or first valid) bundle onto answer/examplesData
 * for SSR + SEO. Idempotent.
 *
 *   npx tsx prisma/seed-mc-generated.ts [--dry]
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";

const prisma = new PrismaClient();
const DIR = join(process.cwd(), "prisma", "data", "generated", "mc");
const DRY = process.argv.includes("--dry");

type Bundle = { answer: string; files: Record<string, string> };

function lint(fw: string, b: Bundle): string[] {
  const issues: string[] = [];
  if (!b || typeof b.answer !== "string" || b.answer.length < 120) issues.push("answer too short");
  if (!b?.files || typeof b.files !== "object") return ["no files"];
  if (!/```/.test(b.answer || "")) issues.push("no code fence");
  const paths = Object.keys(b.files);
  if (fw === "react" && !paths.includes("/App.js")) issues.push("missing /App.js");
  if (fw === "vue" && !paths.includes("/src/App.vue")) issues.push("missing /src/App.vue");
  if (fw === "angular") {
    if (!paths.includes("/src/app/app.component.ts")) issues.push("missing app.component.ts");
    const code = Object.values(b.files).join("\n");
    if (/\?\./.test(code)) issues.push("optional chaining (?.)");
    if (/\?\?/.test(code)) issues.push("nullish coalescing (??)");
  }
  if (Object.values(b.files).some((c) => !c || c.trim().length < 40)) issues.push("empty file");
  return issues;
}

async function main() {
  if (!existsSync(DIR)) {
    console.log("No generated dir yet:", DIR);
    process.exit(0);
  }
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
  let updated = 0;
  let skipped = 0;

  for (const f of files) {
    const slug = basename(f, ".json");
    const raw = JSON.parse(readFileSync(join(DIR, f), "utf8")) as Record<string, Bundle>;

    const valid: Record<string, Bundle> = {};
    const report: string[] = [];
    for (const [fw, b] of Object.entries(raw)) {
      const issues = lint(fw, b);
      if (issues.length === 0) valid[fw] = b;
      else report.push(`${fw}: ${issues.join("/")}`);
    }

    const q = await prisma.prepQuestion.findFirst({
      where: { slug, technology: "machine-coding" },
      select: { id: true },
    });
    if (!q) {
      console.warn(`[${slug}] no matching question; skip`);
      skipped++;
      continue;
    }
    if (Object.keys(valid).length === 0) {
      console.warn(`[${slug}] no valid frameworks (${report.join("; ")}); skip`);
      skipped++;
      continue;
    }

    const def = valid.react ?? Object.values(valid)[0];
    if (!DRY) {
      await prisma.prepQuestion.update({
        where: { id: q.id },
        data: {
          answer: def.answer,
          examplesData: JSON.stringify([{ label: "Complete solution", files: def.files }]),
          frameworksData: JSON.stringify(valid),
        },
      });
    }
    updated++;
    console.log(
      `[${slug}] ${DRY ? "would set" : "set"} [${Object.keys(valid).join(", ")}]` +
        (report.length ? `  ⚠ dropped ${report.join("; ")}` : ""),
    );
  }

  console.log(`\n${DRY ? "(dry) " : ""}Updated ${updated}, skipped ${skipped}.`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
const db = new PrismaClient();
const rows = await db.prepQuestion.findMany({ where: { technology: "nextjs" }, orderBy: { id: "asc" } });
const dir = join(process.cwd(), "prisma", "data");
const ultra = new Map<string, string>(), gold = new Set<string>();
for (const f of readdirSync(dir).filter((f) => /^nextjs-augments-(ultra|gold).*\.ts$/.test(f)).sort()) {
  const mod = await import(pathToFileURL(join(dir, f)).href);
  for (const a of (mod.default ?? mod.augments)) (f.includes("ultra") ? ultra.set(a.title, f) : gold.add(a.title));
}
console.log("rows:", rows.length, "| titles in gold files:", gold.size, "| titles in ultra files:", ultra.size);
const fields = Object.keys(rows[0]);
console.log("columns:", fields.join(","));
const stats = (r: any) => ({
  len: (r.answer ?? "").length,
  card: (r.answer ?? "").includes("#1c140a"),
  pin: (r.answer ?? "").includes("📌"),
  svg: (r.answer ?? "").includes("iq-diagram"),
  ver: /Verified/i.test(r.answer ?? ""),
  ex: (() => { try { return JSON.parse(r.examplesData ?? "[]").length; } catch { return 0; } })(),
});
let nUltra = 0, nCard = 0, nDesc = 0;
for (const r of rows) { const s = stats(r); if (s.card) nCard++; if ((r.description ?? "").includes("strong answer")) nDesc++; if (ultra.has(r.title)) nUltra++; }
console.log("in DB with amber card:", nCard, "| description has rubric:", nDesc, "| rows whose title is in ultra files:", nUltra);
console.log("\nidx | id | diff | len | card | ex | ultra | title");
rows.forEach((r, i) => { const s = stats(r); console.log(`${String(i + 1).padStart(3)} | ${String(r.id).slice(0, 6)} | ${(r.difficulty ?? "?").slice(0, 3)} | ${String(s.len).padStart(5)} | ${s.card ? "Y" : "-"} | ${s.ex} | ${ultra.has(r.title) ? ultra.get(r.title)!.replace("nextjs-augments-", "").replace(".ts", "") : "  -  "} | ${r.title}`); });
await db.$disconnect();

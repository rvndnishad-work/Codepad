/**
 * Renders a blog post's cover.svg to cover.png (social previews and cards need
 * a raster image) and saves a PNG preview of every other SVG so they can be
 * checked by eye.
 *
 * Run with: npx tsx scripts/render-blog-cover.ts <slug> [previewDir]
 *
 * Reads public/blog-images/<slug>/*.svg. Writes public/blog-images/<slug>/cover.png,
 * and previews to previewDir (default: the OS temp dir), never into the repo.
 * Uses Playwright's Chromium; set CHROMIUM_PATH to use a specific binary.
 */
import { chromium } from "@playwright/test";
import { readdirSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npx tsx scripts/render-blog-cover.ts <slug> [previewDir]");
    process.exit(1);
  }
  const dir = join(process.cwd(), "public", "blog-images", slug);
  if (!existsSync(join(dir, "cover.svg"))) {
    console.error(`Missing ${join("public", "blog-images", slug, "cover.svg")}`);
    process.exit(1);
  }
  const previewDir = process.argv[3] ?? join(tmpdir(), `blog-previews-${slug}`);
  mkdirSync(previewDir, { recursive: true });

  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  try {
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".svg")).sort()) {
      const svg = readFileSync(join(dir, file), "utf8");
      const vb = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg);
      if (!vb) throw new Error(`${file}: needs a viewBox="0 0 W H"`);
      const width = Math.round(Number(vb[1]));
      const height = Math.round(Number(vb[2]));
      const page = await browser.newPage({ viewport: { width, height } });
      await page.setContent(
        `<!doctype html><html><body style="margin:0;background:transparent">${svg.replace(/^<\?xml[^>]*>/, "")}</body></html>`,
      );
      const out = file === "cover.svg" ? join(dir, "cover.png") : join(previewDir, file.replace(/\.svg$/, ".png"));
      await page.locator("svg").first().screenshot({ path: out, omitBackground: true });
      await page.close();
      console.log(`${file} -> ${out}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

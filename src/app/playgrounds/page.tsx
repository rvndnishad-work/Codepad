import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPopularTemplateIds } from "@/lib/popular-templates";
import { timed, pingDb } from "@/lib/timing";
import "@/components/wow/wow.css";
import "@/components/home-wow/home-wow.css";
import PlaygroundsBrowser from "./PlaygroundsBrowser";

export const metadata: Metadata = {
  title: "Playgrounds | Interviewpad",
  description:
    "Pre-wired browser sandboxes for React, Vue, Angular, Svelte, Solid, TypeScript and more. Zero install, save and share with one click.",
};

export default async function PlaygroundsPage() {
  // TEMP timing instrumentation — see src/lib/timing.ts. Remove once latency
  // source is confirmed in Vercel logs.
  const pageStart = performance.now();
  await pingDb(prisma);

  const session = await timed("playgrounds:auth", () => auth().catch(() => null));
  const userId = session?.user?.id;

  let welcome: {
    name: string | null;
    image: string | null;
    snippetCount: number;
    recent: { slug: string; title: string; template: string } | null;
  } | null = null;

  if (userId) {
    const [count, recent] = await timed("playgrounds:queries", () =>
      Promise.all([
        prisma.snippet.count({ where: { userId } }),
        prisma.snippet.findFirst({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          select: { slug: true, title: true, template: true },
        }),
      ]),
    );
    welcome = {
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
      snippetCount: count,
      recent,
    };
  }

  console.log(
    `[timing] playgrounds:total ${Math.round(performance.now() - pageStart)}ms`,
  );
  // Global usage ranking for the "Most Popular" row — one indexed aggregate,
  // resolved server-side so the section renders with correct data on first
  // paint (no client fetch, no flash of the fallback list).
  const popularIds = await timed("playgrounds:popular", () =>
    getPopularTemplateIds(4),
  );
  return <PlaygroundsBrowser welcome={welcome} popularIds={popularIds} />;
}

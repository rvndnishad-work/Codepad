import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PlaygroundsBrowser from "./PlaygroundsBrowser";

export const metadata: Metadata = {
  title: "Playgrounds | Interviewpad",
  description:
    "Pre-wired browser sandboxes for React, Vue, Angular, Svelte, Solid, TypeScript and more. Zero install, save and share with one click.",
};

export default async function PlaygroundsPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;

  let welcome: {
    name: string | null;
    image: string | null;
    snippetCount: number;
    recent: { slug: string; title: string; template: string } | null;
  } | null = null;

  if (userId) {
    const [count, recent] = await Promise.all([
      prisma.snippet.count({ where: { userId } }),
      prisma.snippet.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { slug: true, title: true, template: true },
      }),
    ]);
    welcome = {
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
      snippetCount: count,
      recent,
    };
  }

  return <PlaygroundsBrowser welcome={welcome} />;
}

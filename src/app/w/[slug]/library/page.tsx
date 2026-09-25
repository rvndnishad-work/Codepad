import { notFound, redirect } from "next/navigation";
import {
  LibraryError,
  loadChallengeCategories,
  loadPublicCategories,
  loadQuestionnaires,
  loadWorkspaceChallenges,
  resolveLibraryActor,
  searchPublicQuestions,
} from "@/lib/library/library-server";
import LibraryClient, { type LibraryTab } from "./LibraryClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; open?: string; tech?: string }>;
};

export const metadata = { title: "Question library — Interviewpad", robots: { index: false, follow: false } };

const TABS: LibraryTab[] = ["questionnaires", "public", "challenges"];

export default async function QuestionLibraryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const actor = await resolveLibraryActor(slug).catch((err) => {
    if (err instanceof LibraryError && err.status === 401) redirect(`/login?next=/w/${slug}/library`);
    if (err instanceof LibraryError && err.status === 404) notFound();
    redirect("/dashboard");
  });

  const tab = TABS.includes(sp.tab as LibraryTab) ? (sp.tab as LibraryTab) : "questionnaires";
  const tech = sp.tech ?? null;
  const [questionnaires, bank, firstPage, challenges, challengeBank] = await Promise.all([
    loadQuestionnaires(actor.workspaceId),
    loadPublicCategories(),
    searchPublicQuestions({ tech }),
    loadWorkspaceChallenges(actor.workspaceId),
    loadChallengeCategories(actor.workspaceId),
  ]);

  return (
    <LibraryClient
      slug={slug}
      initialTab={tab}
      initialOpen={sp.open ?? null}
      canManage={actor.canManage}
      aiScreening={actor.aiScreening}
      questionnaires={questionnaires}
      categories={bank.categories}
      rounds={bank.rounds}
      bankTotal={bank.total}
      firstPage={{ ...firstPage, tech }}
      challenges={challenges}
      challengeCategories={challengeBank.categories}
      challengeTotal={challengeBank.total}
    />
  );
}

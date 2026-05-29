import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ challenge?: string }>;
};

export default async function LeaderboardRedirectPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  
  if (sp.challenge) {
    redirect(`/w/${slug}?section=candidates&view=leaderboard&challenge=${sp.challenge}`);
  } else {
    redirect(`/w/${slug}?section=candidates&view=leaderboard`);
  }
}

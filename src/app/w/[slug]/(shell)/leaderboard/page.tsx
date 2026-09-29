import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** The leaderboard became each batch's Results tab. */
export default async function LeaderboardRedirectPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/w/${slug}/batches`);
}

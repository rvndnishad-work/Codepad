import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function CandidatesRedirectPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/w/${slug}?section=candidates&view=pipeline`);
}

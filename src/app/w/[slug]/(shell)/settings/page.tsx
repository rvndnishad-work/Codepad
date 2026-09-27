import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** /w/[slug]/settings opens the General tab. */
export default async function SettingsIndex({ params }: Props) {
  const { slug } = await params;
  redirect(`/w/${slug}/settings/general`);
}

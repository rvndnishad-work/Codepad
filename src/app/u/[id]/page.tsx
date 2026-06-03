import { redirect } from "next/navigation";
import { generateMetadata as portfolioMetadata } from "./portfolio/page";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  return portfolioMetadata({ params });
}

export default async function UserProfileIndexRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/u/${id}/portfolio`);
}


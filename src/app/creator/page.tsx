import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/permissions/access";
import CreatorOnboarding from "./CreatorOnboarding";

export const metadata = {
  title: "Creator Studio — Interviewpad",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ create?: string }>;
};

export default async function CreatorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/creator");
  if (!(await userCan(userId, "content:author"))) redirect("/dashboard");

  const spaces = await prisma.creatorSpace.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  });

  // If the user already has spaces and create is not true, redirect to their first space
  if (spaces.length > 0 && params.create !== "true") {
    redirect(`/creator/${spaces[0].handle}`);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <CreatorOnboarding />
    </div>
  );
}

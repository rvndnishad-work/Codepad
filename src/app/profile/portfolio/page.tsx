import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PortfolioSettings from "./PortfolioSettings";

export const metadata = {
  title: "Portfolio Settings — Interviewpad",
};

export default async function PortfolioSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/profile/portfolio");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, bio: true, hireMeUrl: true, portfolioPublic: true, name: true },
  });
  if (!user) redirect("/login");

  return (
    <PortfolioSettings
      userId={user.id}
      initial={{
        bio: user.bio ?? "",
        hireMeUrl: user.hireMeUrl ?? "",
        portfolioPublic: user.portfolioPublic,
      }}
    />
  );
}

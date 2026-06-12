import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { userCan } from "@/lib/permissions/access";
import BecomeCreatorClient from "./BecomeCreatorClient";

export const metadata = {
  title: "Become a Creator — Interviewpad",
};

export default async function BecomeCreatorPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) redirect("/login?next=/become-creator");
  // Already a creator → straight to the studio.
  if (await userCan(userId, "content:author")) redirect("/creator");

  const app = await prisma.creatorApplication.findUnique({ where: { userId } });

  return (
    <BecomeCreatorClient
      application={
        app
          ? {
              platform: app.platform,
              profileUrl: app.profileUrl,
              followerCount: app.followerCount,
              status: app.status,
              reviewNote: app.reviewNote,
            }
          : null
      }
    />
  );
}

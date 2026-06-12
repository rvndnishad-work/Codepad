import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { userCan } from "@/lib/permissions/access";
import { isStaff } from "@/lib/permissions/staff";
import CreatorSidebar from "./CreatorSidebar";

type Props = {
  children: React.ReactNode;
  params: Promise<{ handle: string }>;
};

export default async function CreatorSpaceLayout({ children, params }: Props) {
  const { handle } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/creator/${handle}`)}`);
  }

  const userId = session.user.id;
  const isAuthor = await userCan(userId, "content:author");
  const isModerator = await userCan(userId, "content:moderate");

  if (!isAuthor && !isModerator) {
    redirect("/dashboard");
  }

  // Fetch all spaces: moderators can see and manage all spaces, ordinary creators only see their own
  const spaces = isModerator
    ? await prisma.creatorSpace.findMany({ orderBy: { createdAt: "asc" } })
    : await prisma.creatorSpace.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "asc" },
      });

  // Check if the current space belongs to this creator or if user is moderator
  const activeSpace = spaces.find((s) => s.handle === handle);
  if (!activeSpace) {
    // If the space is not found or not owned/moderate, fallback to creator base router
    redirect("/creator");
  }

  const showAdmin = await isStaff(session);

  return (
    <div className="bg-bg text-fg flex flex-col md:flex-row relative font-sans h-[calc(100vh-64px)] overflow-hidden">
      {/* Creator Sidebar */}
      <CreatorSidebar
        activeHandle={handle}
        activeSpaceName={activeSpace.name}
        spaces={spaces.map((s) => ({ name: s.name, handle: s.handle }))}
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
        isAdmin={showAdmin}
      />

      {/* Main scrollable area */}
      <main className="flex-1 min-w-0 relative z-10 bg-bg overflow-y-auto h-full">
        <div className="workspace-content mx-auto w-full max-w-5xl p-4 md:p-8 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

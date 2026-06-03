import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ChallengeForm from "@/app/admin/challenges/ChallengeForm";
import { blankStep } from "@/app/admin/challenges/challenge-form-types";

export const metadata = {
  title: "Create a challenge — Interviewpad",
};

export default async function NewUserChallengePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect("/login?next=/dashboard/challenges/new");

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <ChallengeForm
        mode="create"
        initial={{
          slug: "",
          title: "",
          description:
            "## What is this?\n\nA short summary that appears above the questions.\n",
          difficulty: "easy",
          tagsCsv: "",
          category: "",
          published: false,
          visibility: "public",
          // Users can't self-feature; this stays false and the form hides
          // the toggle for non-admin surfaces (allowFeatured=false there).
          featured: false,
          premium: false,
          steps: [blankStep()],
        }}
        surface={{
          redirectTo: "/dashboard",
          createEndpoint: "/api/challenges",
          itemEndpoint: "/api/challenges",
          isAdmin: false,
        }}
      />
    </div>
  );
}

import ChallengeForm from "../ChallengeForm";
import { blankStep } from "../challenge-form-types";
import { requireAdminAccess } from "@/lib/permissions/staff";

export default async function NewChallengePage() {
  await requireAdminAccess("content:curate");
  return (
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
        featured: false,
        premium: false,
        steps: [blankStep()],
      }}
      surface={{
        redirectTo: "/admin/challenges",
        createEndpoint: "/api/admin/challenges",
        itemEndpoint: "/api/admin/challenges",
        isAdmin: true,
      }}
    />
  );
}

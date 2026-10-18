import { auth } from "@/lib/auth";
import { validatePageAccess } from "@/lib/settings";
import FeaturesClient from "./FeaturesClient";
import { recruiterUrl } from "@/lib/domains";

export const metadata = {
  title: "Features — Platform Features",
  description: "Explore Intervutree's assessment pipelines, AI proctoring, key timeline replays, Greenhouse/Lever ATS integrations, and corporate developer hiring workspaces.",
  alternates: { canonical: recruiterUrl("/features") },
};

export default async function FeaturesPage() {
  const session = await auth().catch(() => null);
  await validatePageAccess("/features", session);

  return <FeaturesClient />;
}
